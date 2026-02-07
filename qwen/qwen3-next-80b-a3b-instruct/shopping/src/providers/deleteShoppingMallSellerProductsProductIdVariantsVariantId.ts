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
  productId: string;
  variantId: string;
}): Promise<void> {
  // 1. Validate variant exists and belongs to the specified product and seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.variantId,
        product_id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  if (!variant) {
    throw new HttpException(
      "Variant not found or does not belong to this seller",
      404,
    );
  }
  // 2. Check for any order items with this variant_id in 'paid' or 'shipped' status
  const existingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (existingOrderItems.length > 0) {
    throw new HttpException(
      "Cannot delete variant because it has paid or shipped order items",
      409,
    );
  }
  // 3. Remove cart items referencing this variant
  await MyGlobal.prisma.shopping_mall_cart_items.updateMany({
    where: { shopping_mall_product_variant_id: props.variantId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // 4. Delete the variant record from shopping_mall_product_variants
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // 5. Log deletion event in shopping_mall_system_logs
  await MyGlobal.prisma.shopping_mall_system_logs.create({
    data: {
      id: v4(),
      created_at: toISOStringSafe(new Date()),
      event_type: "product_variant_deleted",
      severity: "info",
      metadata: JSON.stringify({
        variant_id: props.variantId,
        product_id: props.productId,
        seller_id: props.seller.id,
        actor_id: props.seller.id,
        actor_type: "seller",
      }),
    },
  });
  // 6. Return 204 No Content (void)
}
