import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId } = props;

  // Verify product exists and fetch associated SKUs with order items
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    include: {
      shopping_mall_skus: {
        include: {
          shopping_mall_order_items: {
            take: 1,
          },
        },
      },
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Check if any SKU has order history
  const hasOrderHistory = product.shopping_mall_skus.some(
    (sku) => sku.shopping_mall_order_items.length > 0,
  );

  if (hasOrderHistory) {
    throw new HttpException(
      "Cannot delete product with order history. Please mark as discontinued instead.",
      400,
    );
  }

  // Perform hard delete - cascades to SKUs, images per schema relations
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: productId },
  });
}
