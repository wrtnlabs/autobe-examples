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
  productId: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // Load current product
  const current = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!current) throw new HttpException("Product not found", 404);
  // Verify seller ownership
  if (current.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate product not already deleted
  if (current.status === "deleted") {
    throw new HttpException("Cannot update deleted product", 400);
  }
  // Create snapshot preserving current state before update
  await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: current.shopping_mall_seller_id,
      shopping_mall_subcategory_id: current.shopping_mall_subcategory_id,
      name: current.name,
      description: current.description,
      base_price: current.base_price,
      status: current.status,
      created_at: toISOStringSafe(current.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(current.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: current.deleted_at
        ? (toISOStringSafe(current.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    },
  });
  // Update product with new values
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  return {
    id: updated.id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    shopping_mall_subcategory_id: updated.shopping_mall_subcategory_id,
    name: current.name,
    description: current.description,
    base_price: current.base_price,
    status: current.status,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updated.deleted_at
      ? (toISOStringSafe(updated.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
