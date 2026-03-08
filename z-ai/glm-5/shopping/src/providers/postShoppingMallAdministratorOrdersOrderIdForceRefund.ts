import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrdersOrderIdForceRefund(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceRefund;
}): Promise<IShoppingMallOrder> {
  const now = new Date();
  const reasonText = `Administrator force-refund: ${props.body.reason}`;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify order exists
    await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: { id: true },
    });
    // Get all order items
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
    });
    // Process each item
    for (const item of orderItems) {
      // Skip already refunded or cancelled items
      if (item.status === "refunded" || item.status === "cancelled") {
        continue;
      }
      // Update item status to refunded
      await tx.shopping_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Check for pending refund request
      const pendingRefund = await tx.shopping_mall_refund_requests.findUnique({
        where: { shopping_mall_order_item_id: item.id },
      });
      let refundRequestId: string | null = null;
      if (pendingRefund && pendingRefund.status === "pending") {
        refundRequestId = pendingRefund.id;
        // Close the refund request
        await tx.shopping_mall_refund_requests.update({
          where: { id: pendingRefund.id },
          data: {
            status: "approved",
            responded_at: now,
          },
        });
      }
      // Create inventory record to restore stock
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          variant_id: item.shopping_mall_product_variant_id,
          order_id: props.orderId,
          refund_request_id: refundRequestId,
          quantity_change: item.quantity,
          reason: reasonText,
          created_at: now,
        },
      });
    }
    // Update order status to refunded
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
  });
  // Fetch the updated order using transformer select
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
}
