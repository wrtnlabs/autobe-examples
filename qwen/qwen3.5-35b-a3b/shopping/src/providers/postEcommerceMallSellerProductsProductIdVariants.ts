import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantCollector } from "../collectors/EcommerceMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreate;
}): Promise<IEcommerceMallProductVariant> {
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: {
        id: props.seller.id,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or not accessible", 404);
  }
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: {
        sku: props.body.sku,
      },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU code must be unique across all variants", 409);
  }
  if (props.body.base_price <= 0) {
    throw new HttpException("base_price must be a positive number", 400);
  }
  if (props.body.stock_quantity < 0) {
    throw new HttpException("stock_quantity must be non-negative", 400);
  }
  if (props.body.sale_price !== undefined && props.body.sale_price !== null) {
    if (props.body.sale_price <= 0) {
      throw new HttpException(
        "sale_price must be a positive number if provided",
        400,
      );
    }
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    if (
      props.body.status !== "active" &&
      props.body.status !== "inactive" &&
      props.body.status !== "discontinued"
    ) {
      throw new HttpException(
        "status must be one of: active, inactive, discontinued",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data: await EcommerceMallProductVariantCollector.collect({
      body: props.body,
      ecommerceMallProducts: {
        id: props.productId,
      } satisfies IEntity,
      ecommerceMallSellers: { id: props.seller.id } satisfies IEntity,
    }),
    ...EcommerceMallProductVariantTransformer.select(),
  });
  return await EcommerceMallProductVariantTransformer.transform(created);
}
