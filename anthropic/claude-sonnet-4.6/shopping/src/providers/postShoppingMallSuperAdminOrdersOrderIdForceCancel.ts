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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminOrdersOrderIdForceCancel(props: {
  superAdmin: SuperadminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceCancel;
}): Promise<IShoppingMallOrder> {
  // Step 1: Verify the order exists (throws 404 if not found)
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
  // Step 3: Reject if any item is in 'delivered' status (incompatible with force-cancel)
  const deliveredItem = orderItems.find((item) => item.status === "delivered");
  if (deliveredItem !== undefined) {
    throw new HttpException(
      `Cannot force-cancel order: item ${deliveredItem.id} is in 'delivered' status, which does not permit cancellation`,
      400,
    );
  }
  // Step 4: Identify items eligible for cancellation ('paid' or 'shipped')
  const cancellableItems = orderItems.filter(
    (item) => item.status === "paid" || item.status === "shipped",
  );
  // Step 5: Execute within a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    const reason = props.body.reason ?? null;
    // 5a. Cancel each eligible item and restore inventory
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
          note: reason,
          created_at: now,
        },
      });
    }
    // 5b. Recalculate overall order status from final item statuses
    const finalStatuses = orderItems.map((item) =>
      cancellableItems.some((ci) => ci.id === item.id)
        ? "cancelled"
        : item.status,
    );
    const allCancelled = finalStatuses.every((s) => s === "cancelled");
    const newOrderStatus = allCancelled ? "cancelled" : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // Step 6: Fetch and return the updated order using the transformer
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
}
