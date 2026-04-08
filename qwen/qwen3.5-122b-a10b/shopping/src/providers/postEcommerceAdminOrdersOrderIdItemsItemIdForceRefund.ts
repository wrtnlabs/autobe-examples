import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemTransformer } from "../transformers/EcommerceOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdminOrdersOrderIdItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItem> {
  // Verify order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Verify order item exists and belongs to the order
  const item = await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
    },
    select: {
      id: true,
      quantity: true,
      status: true,
      ecommerce_product_variant_id: true,
    },
  });
  // Check if already refunded - reject with 409 Conflict
  if (item.status === "refunded") {
    throw new HttpException("Item is already refunded", 409);
  }
  // Begin transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update item status to refunded
    await tx.ecommerce_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "refunded",
        updated_at: new Date(),
      },
    });
    // Create inventory record to restore stock
    await tx.ecommerce_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_product_variant_id: item.ecommerce_product_variant_id,
        quantity_change: item.quantity,
        reason: "refund",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create refund request for audit trail
    const refundRequest = await tx.ecommerce_refund_requests.create({
      data: {
        id: v4(),
        ecommerce_order_item_id: props.itemId,
        reason: "Administrator force-refund",
        status: "approved",
        responded_at: new Date(),
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create refund request snapshot for audit trail
    await tx.ecommerce_refund_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_refund_request_id: refundRequest.id,
        reason: "Administrator force-refund",
        status: "approved",
        seller_response: null,
        response_at: new Date(),
        created_at: new Date(),
      },
    });
    // Recalculate parent order status based on all item statuses
    const allItems = await tx.ecommerce_order_items.findMany({
      where: { ecommerce_order_id: props.orderId },
      select: { status: true },
    });
    const allRefunded = allItems.every((i) => i.status === "refunded");
    if (allRefunded) {
      await tx.ecommerce_orders.update({
        where: { id: props.orderId },
        data: {
          status: "refunded",
          updated_at: new Date(),
        },
      });
    }
    // Fetch updated item with all relations for response
    const updatedItem = await tx.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceOrderItemTransformer.select(),
    });
    return updatedItem;
  });
  return await EcommerceOrderItemTransformer.transform(result);
}
