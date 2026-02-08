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
  // Verify the variant belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: { id: props.productId },
      },
    });
  if (!variant) throw new HttpException("Product variant not found", 404);
  // Check for pending order items
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        productVariant: { id: props.variantId },
        status: { in: ["pending", "processing"] },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete variant with pending order items",
      400,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        seller_approval_status: "pending",
        orderItem: { productVariant: { id: props.variantId } },
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      400,
    );
  }
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: { productVariant: { id: props.variantId } },
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      400,
    );
  }
  // Perform hard delete in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_variants.delete({
      where: { id: props.variantId },
    });
    // Log the deletion action
    await tx.shopping_mall_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "delete_variant",
        description: `Deleted product variant ${props.variantId}`,
        actor_type: "seller",
        actor_id: props.seller.id,
        metadata: JSON.stringify({
          variantId: props.variantId,
          productId: props.productId,
        }),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  });
}
