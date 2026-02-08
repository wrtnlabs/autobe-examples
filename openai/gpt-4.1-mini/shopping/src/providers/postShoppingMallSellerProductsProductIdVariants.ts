import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  const { seller, productId } = props;
  // Cast body to any to access missing properties safely
  const body = props.body as {
    sku_code: string;
    stock_quantity: number;
    price_override?: number | null;
  };
  // Verify seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== seller.id) {
    throw new HttpException("Forbidden: Not owner of the product", 403);
  }
  // Check sku_code uniqueness per product
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: productId,
        sku_code: body.sku_code,
        deleted_at: null,
      },
    });
  if (existingVariant) {
    throw new HttpException("Duplicate SKU code", 409);
  }
  if (body.stock_quantity < 0) {
    throw new HttpException("stock_quantity must be non-negative", 400);
  }
  const now = toISOStringSafe(new Date());
  // Insert new product variant
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: {
      id: v4(),
      shopping_mall_product_id: productId,
      sku_code: body.sku_code,
      price_override: body.price_override ?? null,
      stock_quantity: body.stock_quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Map to response type
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    price_override: created.price_override ?? null,
    stock_quantity: created.stock_quantity,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
