import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<void> {
  // Validate productId is a valid UUID format
  typia.assert<string & tags.Format<"uuid">>(props.productId);
  // Find all active variants for this product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Extract variant IDs
  const variantIds = variants.map((v) => v.id);
  // Check for any order items with status 'paid' or 'shipped' for these variants
  const conflictingItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        variant_id: {
          in: variantIds,
        },
        status: {
          in: ["paid", "shipped"],
        },
      },
      take: 1,
    });
  // If any conflicting order items exist, block deletion
  if (conflictingItems.length > 0) {
    throw new HttpException(
      "Cannot delete product because variants have paid or shipped order items",
      409,
    );
  }
  // Update product with deleted_at timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_products.update({
    where: {
      id: props.productId,
    },
    data: {
      deleted_at: typia.assert<string & tags.Format<"date-time">>(now),
    },
  });
  // Return void (204 No Content)
  return;
}
