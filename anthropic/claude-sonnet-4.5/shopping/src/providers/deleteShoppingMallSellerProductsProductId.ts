import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId } = props;

  // Step 1: Fetch product and verify ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    include: {
      shopping_mall_skus: {
        include: {
          shopping_mall_order_items: true,
        },
      },
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Step 2: Verify seller ownership
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own products",
      403,
    );
  }

  // Step 3: Check for order history
  const hasOrders = product.shopping_mall_skus.some(
    (sku) => sku.shopping_mall_order_items.length > 0,
  );

  if (hasOrders) {
    throw new HttpException(
      "Cannot delete product with order history. Please mark as discontinued instead.",
      400,
    );
  }

  // Step 4: Perform hard delete (cascading deletion handles SKUs, images, etc.)
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: productId },
  });
}
