import { NotFoundException } from '@nestjs/common';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleException(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.productRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    try {
      let product: Product;
      if (isUUID(id)) {
        product = await this.productRepository.findOneByOrFail({ id: id });
      } else {
        const queryBuilder = this.productRepository.createQueryBuilder();
        product = await queryBuilder
          .where(`UPPER(title)=:title or slug=:slug`, {
            title: id.toLocaleUpperCase(),
            slug: id.toLocaleLowerCase(),
          })
          .getOneOrFail();
      }

      return product;
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
    });

    if (!product) {
      throw new NotFoundException(`The product with id: ${id} not found`);
    }

    try {
      await this.productRepository.save(product);

      return product;
    } catch (error) {
      this.handleException(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    this.productRepository.remove(product);
    return `Removed a #${id} product`;
  }

  private handleException(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected erro check server log!!!',
    );
  }
}
