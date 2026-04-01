import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductCollector } from "../collectors/EcommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  // Validate required fields
  if (!props.body.name || props.body.name.trim().length === 0) {
    throw new HttpException("Name is required", 400);
  }
  if (!props.body.category_id) {
    throw new HttpException("Category ID is required", 400);
  }
  if (props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  // Validate slug if provided
  if (props.body.slug) {
    const existingProduct =
      await MyGlobal.prisma.ecommerce_mall_products.findFirst({
        where: {
          slug: props.body.slug,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingProduct) {
      throw new HttpException("Slug already exists", 400);
    }
  }
  // Verify category exists and is active
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
    select: { id: true, is_active: true },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  if (category.is_active === false) {
    throw new HttpException("Category is not active", 400);
  }
  // Collect and create product
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      ecommerceMallSellers: { id: props.seller.id },
    }),
    ...EcommerceMallProductTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallProductTransformer.transform(created);
}
