import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrdersOrderIdItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IForceRefund;
}): Promise<IEcommerceMallOrderItem> {
  // 1. Verify order exists and is not deleted
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId, deleted_at: null },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // 2. Verify order item exists and belongs to the order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // 3-6. Execute within transaction: snapshot, update status, create inventory record
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 3. Create snapshot of current order item state
    const snapshotId = v4() as string & tags.Format<"uuid">;
    await tx.ecommerce_mall_order_item_snapshots.create({
      data: {
        id: snapshotId,
        order_item_id: props.itemId,
        changed_by_id: props.admin.id,
        snapshot_type: "refund",
        created_at: new Date(),
        previous_values: JSON.stringify({
          id: orderItem.id,
          quantity: orderItem.quantity,
          unit_price: orderItem.unit_price,
          status: orderItem.status,
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          ecommerce_mall_product_variant_id:
            orderItem.ecommerce_mall_product_variant_id,
          created_at: orderItem.created_at,
          updated_at: orderItem.updated_at,
          deleted_at: orderItem.deleted_at,
        }),
        current_values: JSON.stringify({
          id: orderItem.id,
          quantity: orderItem.quantity,
          unit_price: orderItem.unit_price,
          status: "refunded",
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          ecommerce_mall_product_variant_id:
            orderItem.ecommerce_mall_product_variant_id,
          created_at: orderItem.created_at,
          updated_at: new Date(),
          deleted_at: null,
        }),
      },
    });
    // 4. Update order item status to 'refunded'
    await tx.ecommerce_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "refunded",
        updated_at: new Date(),
      },
    });
    // 5. Create inventory record to restore stock
    const inventoryRecordId = v4() as string & tags.Format<"uuid">;
    const variant = await tx.ecommerce_mall_product_variants.findUnique({
      where: { id: orderItem.ecommerce_mall_product_variant_id },
    });
    const currentStock = variant
      ? variant.stock_quantity + orderItem.quantity
      : orderItem.quantity;
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: inventoryRecordId,
        ecommerce_mall_product_variant_id:
          orderItem.ecommerce_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "admin_force_refund",
        recorded_at: new Date(),
        current_stock: currentStock,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // 6. Recalculate order status if all items are refunded
    const remainingItems = await tx.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: props.orderId,
        deleted_at: null,
        status: { not: "refunded" },
      },
    });
    if (remainingItems.length === 0) {
      await tx.ecommerce_mall_orders.update({
        where: { id: props.orderId },
        data: {
          status: "refunded",
          updated_at: new Date(),
        },
      });
    }
  });
  // 7. Return updated order item
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updated);
}
