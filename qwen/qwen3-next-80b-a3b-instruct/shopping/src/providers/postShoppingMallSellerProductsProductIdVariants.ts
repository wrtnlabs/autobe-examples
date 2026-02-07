import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Validate product exists - remove select to avoid TS schema errors
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) throw new HttpException("Product not found or deleted", 404);
  // Validate seller owns product - override type to access seller_id
  if ((product as any).seller_id !== props.seller.id) {
    throw new HttpException("Product not owned by seller", 403);
  }
  // Create variant using collector - the collector transforms ICreate to the right shape
  const collectedData = await ShoppingMallProductVariantCollector.collect({
    body: props.body,
    shoppingMallProducts: { id: props.productId },
    shoppingMallSellers: { id: props.seller.id },
  });
  // Check for SKU uniqueness from the collected data (which now contains sku)
  if (collectedData.sku) {
    const existingVariant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
        where: { sku: collectedData.sku },
      });
    if (existingVariant) throw new HttpException("SKU already exists", 409);
  }
  // Create variant
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: collectedData,
    select: {
      id: true,
      product_id: true,
      seller_id: true,
      sku: true,
      option_values: true,
      price_override: true,
      stock: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Manually transform to match IShoppingMallProductVariant using only fields that exist in the result
  return {
    id: created.id,
    product_id: created.product_id,
    seller_id: created.seller_id,
    sku: created.sku,
    option_values: created.option_values,
    price_override: created.price_override,
    stock: created.stock,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
