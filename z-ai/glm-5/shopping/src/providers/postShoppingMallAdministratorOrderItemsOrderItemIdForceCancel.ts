import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrderItemsOrderItemIdForceCancel(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceCancel;
}): Promise<IShoppingMallOrderItem> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update order item status to cancelled
    await tx.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    // Create inventory restoration record
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id: orderItem.shopping_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: `Force-cancelled by administrator: ${props.body.reason}`,
        created_at: now,
      },
    });
    // Close any pending cancellation request
    const pendingRequest =
      await tx.shopping_mall_cancellation_requests.findFirst({
        where: {
          shopping_mall_order_item_id: props.orderItemId,
          status: "pending",
        },
      });
    if (pendingRequest) {
      await tx.shopping_mall_cancellation_requests.update({
        where: { id: pendingRequest.id },
        data: {
          status: "approved",
          responded_at: now,
        },
      });
    }
    // Recalculate order status
    const siblingItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: orderItem.shopping_mall_order_id },
      select: { status: true },
    });
    const statuses = siblingItems.map((item) => item.status);
    const allCancelled = statuses.every((s) => s === "cancelled");
    const allRefunded = statuses.every((s) => s === "refunded");
    const allDelivered = statuses.every((s) => s === "delivered");
    const allPaid = statuses.every((s) => s === "paid");
    const anyShipped = statuses.some((s) => s === "shipped");
    let newOrderStatus: string;
    if (allCancelled) {
      newOrderStatus = "cancelled";
    } else if (allRefunded) {
      newOrderStatus = "refunded";
    } else if (allDelivered) {
      newOrderStatus = "delivered";
    } else if (allPaid) {
      newOrderStatus = "paid";
    } else if (anyShipped) {
      newOrderStatus = "shipped";
    } else {
      newOrderStatus = "partially_completed";
    }
    await tx.shopping_mall_orders.update({
      where: { id: orderItem.shopping_mall_order_id },
      data: { status: newOrderStatus },
    });
  });
  // Fetch and return the updated order item
  const updatedItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updatedItem);
}
