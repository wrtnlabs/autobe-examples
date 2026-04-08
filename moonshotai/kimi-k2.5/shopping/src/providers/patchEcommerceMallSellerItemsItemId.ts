import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerItemsItemId(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Verify the order item exists and belongs to this seller
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  // If no status update requested, just return current state
  if (props.body.status === undefined) {
    const current =
      await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
        where: { id: props.itemId },
        ...EcommerceMallOrderItemTransformer.select(),
      });
    return await EcommerceMallOrderItemTransformer.transform(current);
  }
  // Validate status transitions
  const currentStatus = orderItem.status;
  const newStatus = props.body.status;
  if (newStatus === "cancelled" && currentStatus !== "paid") {
    throw new HttpException("Only paid items can be cancelled", 400);
  }
  if (newStatus === "refunded" && currentStatus !== "delivered") {
    throw new HttpException("Only delivered items can be refunded", 400);
  }
  if (!["cancelled", "refunded"].includes(newStatus)) {
    throw new HttpException(
      "Invalid status transition through this endpoint",
      400,
    );
  }
  // Perform atomic update with inventory restoration
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update order item status
    await tx.ecommerce_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
    });
    // Create inventory record to restore stock
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        variant: {
          connect: {
            id: orderItem.variant_id,
          },
        },
        quantity_change: orderItem.quantity,
        reason:
          newStatus === "cancelled" ? "order_cancelled" : "order_refunded",
        created_at: new Date(),
      },
    });
    // Get all items in the order to determine new order status
    const allItems = await tx.ecommerce_mall_order_items.findMany({
      where: {
        order_id: orderItem.order_id,
        deleted_at: null,
      },
    });
    // Calculate order status based on all items including the updated one
    const itemStatuses = allItems.map((item) =>
      item.id === props.itemId ? newStatus : item.status,
    );
    const allCancelled = itemStatuses.every((status) => status === "cancelled");
    const allRefunded = itemStatuses.every((status) => status === "refunded");
    const anyDelivered = itemStatuses.some((status) => status === "delivered");
    const anyShipped = itemStatuses.some((status) => status === "shipped");
    const anyPaid = itemStatuses.some((status) => status === "paid");
    let newOrderStatus: string;
    if (allCancelled) {
      newOrderStatus = "cancelled";
    } else if (allRefunded) {
      newOrderStatus = "refunded";
    } else if (anyDelivered) {
      newOrderStatus = "delivered";
    } else if (anyShipped) {
      newOrderStatus = "shipped";
    } else if (anyPaid) {
      newOrderStatus = "paid";
    } else {
      newOrderStatus = "partially_completed";
    }
    await tx.ecommerce_mall_orders.update({
      where: { id: orderItem.order_id },
      data: {
        status: newOrderStatus,
        updated_at: new Date(),
      },
    });
  });
  // Return updated order item
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updated);
}
