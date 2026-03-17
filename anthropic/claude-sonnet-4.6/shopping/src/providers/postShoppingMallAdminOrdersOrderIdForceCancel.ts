import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceCancel;
}): Promise<IShoppingMallOrder> {
  // Step 1: Fetch order (404 if not found)
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Step 2: Load all order items for this order
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: props.orderId },
    select: {
      id: true,
      status: true,
      quantity: true,
      shopping_mall_product_variant_id: true,
    },
  });
  // Step 3: Validate - reject if any item is in 'delivered' status
  const deliveredItem = orderItems.find((item) => item.status === "delivered");
  if (deliveredItem !== undefined) {
    throw new HttpException(
      `Cannot force-cancel order: item ${deliveredItem.id} is in 'delivered' status which does not permit cancellation`,
      400,
    );
  }
  // Step 4: Identify cancellable items (paid or shipped)
  const cancellableItems = orderItems.filter(
    (item) => item.status === "paid" || item.status === "shipped",
  );
  // Step 5: Execute cancellation within a transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Cancel each eligible item and restore inventory
    for (const item of cancellableItems) {
      await tx.shopping_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          quantity: item.quantity,
          reason_type: "order_cancellation",
          note: props.body.reason ?? null,
          created_at: now,
        },
      });
    }
    // Recalculate overall order status
    // After update: cancellable items become 'cancelled'; non-cancellable non-delivered items remain as-is
    const updatedStatuses = orderItems.map((item) =>
      item.status === "paid" || item.status === "shipped"
        ? "cancelled"
        : item.status,
    );
    const allCancelled = updatedStatuses.every(
      (status) => status === "cancelled",
    );
    const newOrderStatus = allCancelled ? "cancelled" : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // Step 6: Fetch and return full updated order
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return ShoppingMallOrderTransformer.transform(updatedOrder);
}
