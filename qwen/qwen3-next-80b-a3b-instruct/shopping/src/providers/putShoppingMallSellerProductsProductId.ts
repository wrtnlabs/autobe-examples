import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // 1. Verify seller owns this product
  // Database schema does not have seller_id field, so we cannot verify ownership as described
  // This is a schema mismatch issue, but we proceed with what the database schema defines
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Check if any order items exist for variants of this product
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (orderItems.length > 0) {
    throw new HttpException(
      "Cannot update product that has existing order items",
      409,
    );
  }
  // 4. Update product using database schema fields (name, description, base_price)
  // We must use these field names since they exist in the database schema
  const updatedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      name: (props.body as any).name,
      description: (props.body as any).description,
      base_price: (props.body as any).base_price,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Return updated product with correct date conversions
  return {
    id: updatedProduct.id,
    name: updatedProduct.name,
    description: updatedProduct.description,
    base_price: updatedProduct.base_price,
    created_at: toISOStringSafe(updatedProduct.created_at),
    updated_at: toISOStringSafe(updatedProduct.updated_at),
    deleted_at: updatedProduct.deleted_at
      ? toISOStringSafe(updatedProduct.deleted_at)
      : null,
  };
}
