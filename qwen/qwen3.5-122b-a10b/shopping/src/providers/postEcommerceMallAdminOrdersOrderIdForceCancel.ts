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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrdersOrderIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IForceCancel;
}): Promise<IEcommerceMallOrder> {
  // Retrieve order with order items
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
          ecommerce_mall_product_variant_id: true,
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              price: true,
              stock_quantity: true,
            },
          },
        },
      },
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Check if order is already cancelled or refunded
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new HttpException("Order is already cancelled or refunded", 409);
  }
  // Perform all operations in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update all order items to cancelled status
    await tx.ecommerce_mall_order_items.updateMany({
      where: { ecommerce_mall_order_id: props.orderId },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    // Create snapshots and inventory records for each order item
    for (const item of order.orderItems) {
      // Create snapshot
      await tx.ecommerce_mall_order_item_snapshots.create({
        data: {
          id: v4(),
          order_item_id: item.id,
          changed_by_id: props.admin.id,
          snapshot_type: "cancellation",
          created_at: new Date(),
          previous_values: JSON.stringify({
            status: item.status,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }),
          current_values: JSON.stringify({
            status: "cancelled",
            quantity: item.quantity,
            unit_price: item.unit_price,
          }),
        },
      });
      // Create inventory record for stock restoration
      const variant =
        await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
          where: { id: item.ecommerce_mall_product_variant_id },
        });
      const newStock = variant.stock_quantity + item.quantity;
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_id:
            item.ecommerce_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: "admin_force_cancel",
          recorded_at: new Date(),
          current_stock: newStock,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      // Update variant stock quantity
      await tx.ecommerce_mall_product_variants.update({
        where: { id: item.ecommerce_mall_product_variant_id },
        data: { stock_quantity: newStock },
      });
    }
    // Update order status to cancelled
    await tx.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
  });
  // Retrieve updated order with all relations
  const updatedOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
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
            created_at: true,
            updated_at: true,
            deleted_at: true,
            ecommerce_mall_product_variant_id: true,
            productVariant: {
              select: {
                id: true,
                sku_code: true,
                price: true,
                stock_quantity: true,
              },
            },
          },
        },
      },
    });
  // Transform to response DTO
  return {
    id: updatedOrder.id,
    order_number: updatedOrder.order_number,
    shipping_recipient_name: updatedOrder.shipping_recipient_name,
    shipping_phone_number: updatedOrder.shipping_phone_number,
    shipping_street_address: updatedOrder.shipping_street_address,
    shipping_city: updatedOrder.shipping_city,
    shipping_state: updatedOrder.shipping_state,
    shipping_postal_code: updatedOrder.shipping_postal_code,
    shipping_country: updatedOrder.shipping_country,
    total_price: updatedOrder.total_price,
    status: updatedOrder.status,
    customer: {
      id: updatedOrder.customer.id,
      email: updatedOrder.customer.email,
      display_name: updatedOrder.customer.display_name,
      phone_number: updatedOrder.customer.phone_number,
      account_status: typia.assert<"active" | "suspended" | "banned">(
        updatedOrder.customer.account_status,
      ),
      created_at: updatedOrder.customer.created_at.toISOString(),
    } satisfies IEcommerceMallCustomer.ISummary,
    order_items: updatedOrder.orderItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      status: item.status,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        status: updatedOrder.status,
        totalPrice: updatedOrder.total_price,
        createdAt: updatedOrder.created_at.toISOString(),
        itemCount: updatedOrder.orderItems.length,
        customer: {
          id: updatedOrder.customer.id,
          email: updatedOrder.customer.email,
          display_name: updatedOrder.customer.display_name,
          phone_number: updatedOrder.customer.phone_number,
          account_status: typia.assert<"active" | "suspended" | "banned">(
            updatedOrder.customer.account_status,
          ),
          created_at: updatedOrder.customer.created_at.toISOString(),
        } satisfies IEcommerceMallCustomer.ISummary,
      } satisfies IEcommerceMallOrder.ISummary,
      productVariant: {
        id: item.productVariant.id,
        sku_code: item.productVariant.sku_code,
        price: item.productVariant.price,
        stock_quantity: item.productVariant.stock_quantity,
        option_values: {},
      } satisfies IEcommerceMallProductVariant.ISummary,
      createdAt: item.created_at.toISOString(),
      updatedAt: item.updated_at.toISOString(),
      deletedAt: item.deleted_at?.toISOString() ?? null,
    })),
    shipments: [],
    created_at: updatedOrder.created_at.toISOString(),
    updated_at: updatedOrder.updated_at.toISOString(),
    deleted_at: updatedOrder.deleted_at?.toISOString() ?? null,
  } satisfies IEcommerceMallOrder;
}
