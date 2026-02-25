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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find product owned by seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Find variant within product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // Step 3: Check for pending orders or refund/cancellation requests
  const pendingOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        productVariant: { id: props.variantId },
        status: {
          in: [
            "paid",
            "shipped",
            "pending",
            "cancel_requested",
            "refund_requested",
          ],
        },
      },
      select: { id: true },
    });
  if (pendingOrderItem !== null) {
    throw new HttpException(
      "Cannot delete variant with pending orders or requests",
      400,
    );
  }
  // Step 4: Delete inventory histories
  await MyGlobal.prisma.shopping_mall_inventory_histories.deleteMany({
    where: { productVariant: { id: props.variantId } },
  });
  // Step 5: Delete the variant
  await MyGlobal.prisma.shopping_mall_product_variants.delete({
    where: { id: props.variantId },
  });
}
