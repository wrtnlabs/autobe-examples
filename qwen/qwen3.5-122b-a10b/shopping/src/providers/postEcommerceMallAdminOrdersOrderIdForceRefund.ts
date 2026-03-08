import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrdersOrderIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IForceRefund;
}): Promise<IEcommerceMallOrder> {
  // Fetch order with all order items
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      order_number: true,
      shipping_recipient_name: true,
      shipping_phone_number: true,
      shipping_street_address: true,
      shipping_city: true,
      shipping_state: true,
      shipping_postal_code: true,
      shipping_country: true,
      total_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          account_status: true,
          created_at: true,
        },
      },
      orderItems: {
        select: {
          id: true,
          quantity: true,
          unit_price: true,
          status: true,
          ecommerce_mall_order_id: true,
          ecommerce_mall_product_variant_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // Check if order is already fully refunded
  const allRefunded = order.orderItems.every(
    (item) => item.status === "refunded",
  );
  if (allRefunded) {
    throw new HttpException("Order is already fully refunded", 409);
  }
  // Process in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Process each order item
    for (const item of order.orderItems) {
      // Create order item snapshot before change
      await tx.ecommerce_mall_order_item_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          order_item_id: item.id,
          changed_by_id: props.admin.id,
          snapshot_type: "refund",
          created_at: now,
          previous_values: JSON.stringify({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: item.status,
            ecommerce_mall_order_id: item.ecommerce_mall_order_id,
            ecommerce_mall_product_variant_id:
              item.ecommerce_mall_product_variant_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            deleted_at: item.deleted_at,
          }),
          current_values: JSON.stringify({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: "refunded",
            ecommerce_mall_order_id: item.ecommerce_mall_order_id,
            ecommerce_mall_product_variant_id:
              item.ecommerce_mall_product_variant_id,
            created_at: item.created_at,
            updated_at: now,
            deleted_at: null,
          }),
        },
      });
      // Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Get current stock from variant before creating inventory record
      const variant =
        await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
          where: { id: item.ecommerce_mall_product_variant_id },
          select: { stock_quantity: true },
        });
      // Create inventory record with positive quantity change
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id:
            item.ecommerce_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: `admin-force-refund-${props.orderId}`,
          recorded_at: now,
          current_stock: variant.stock_quantity + item.quantity,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    // Update order status to refunded
    await tx.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
  });
  // Fetch and return updated order
  const updated = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow(
    {
      where: { id: props.orderId },
      ...EcommerceMallOrderTransformer.select(),
    },
  );
  return await EcommerceMallOrderTransformer.transform(updated);
}
