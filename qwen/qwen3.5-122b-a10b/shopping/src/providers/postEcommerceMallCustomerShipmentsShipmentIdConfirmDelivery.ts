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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  // 1. Validate shipment exists and is not soft-deleted
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      tracking_number: true,
      carrier_name: true,
      shipped_at: true,
      delivered_at: true,
      seller_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          shop_name: true,
          shop_description: true,
          approval_status: true,
          rejection_reason: true,
          account_status: true,
          created_at: true,
        },
      },
    },
  });
  if (shipment === null || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 2. Verify shipment is not already delivered
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment already delivered", 409);
  }
  // 3. Find all orders owned by this customer
  const customerOrders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (customerOrders.length === 0) {
    throw new HttpException("No orders found for this customer", 403);
  }
  const customerOrderIds = customerOrders.map((order) => order.id);
  // 4. Find all order items from customer's orders with status='paid'
  // These are the items that would be in shipments the customer can confirm
  const orderItemsToUpdate =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: {
          in: customerOrderIds,
        },
        status: "paid",
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        status: true,
      },
    });
  if (orderItemsToUpdate.length === 0) {
    throw new HttpException(
      "No payable order items found for this customer",
      400,
    );
  }
  // 5. Begin transaction to update shipment and order items
  const deliveredAt = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a) Update shipment.delivered_at
    await tx.ecommerce_mall_shipments.update({
      where: { id: props.shipmentId },
      data: {
        delivered_at: deliveredAt,
        updated_at: deliveredAt,
      },
    });
    // b) & c) Update all order items to 'delivered' status
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: {
          in: orderItemsToUpdate.map((item) => item.id),
        },
      },
      data: {
        status: "delivered",
        updated_at: deliveredAt,
      },
    });
    // d) Update order status based on all order items' statuses
    const orderIds = [
      ...new Set(
        orderItemsToUpdate.map((item) => item.ecommerce_mall_order_id),
      ),
    ];
    for (const orderId of orderIds) {
      const allOrderItems = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: orderId,
          deleted_at: null,
        },
        select: {
          status: true,
        },
      });
      const statuses = allOrderItems.map((item) => item.status);
      const uniqueStatuses = [...new Set(statuses)];
      let newOrderStatus: string;
      if (uniqueStatuses.length === 1 && uniqueStatuses[0] === "delivered") {
        newOrderStatus = "delivered";
      } else {
        newOrderStatus = "partiallyCompleted";
      }
      await tx.ecommerce_mall_orders.update({
        where: { id: orderId },
        data: {
          status: newOrderStatus,
          updated_at: deliveredAt,
        },
      });
    }
  });
  // 6. Return updated shipment with order_items
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
      where: { id: props.shipmentId },
      select: {
        id: true,
        tracking_number: true,
        carrier_name: true,
        shipped_at: true,
        delivered_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            approval_status: true,
            rejection_reason: true,
            account_status: true,
            created_at: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (updatedShipment === null) {
    throw new HttpException("Shipment not found after update", 404);
  }
  // Get order items that were updated (from customer's orders)
  const shipmentOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: {
          in: customerOrderIds,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_product_variant_id: true,
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_price: true,
            created_at: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            stock_quantity: true,
          },
        },
      },
    });
  // Get customer info for order summary
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      account_status: true,
      created_at: true,
    },
  });
  return {
    id: updatedShipment.id,
    tracking_number: updatedShipment.tracking_number,
    carrier_name: updatedShipment.carrier_name,
    shipped_at: toISOStringSafe(updatedShipment.shipped_at),
    delivered_at: updatedShipment.delivered_at
      ? toISOStringSafe(updatedShipment.delivered_at)
      : null,
    seller: {
      id: updatedShipment.seller.id,
      email: updatedShipment.seller.email,
      shop_name: updatedShipment.seller.shop_name,
      shop_description: updatedShipment.seller.shop_description ?? null,
      approval_status: typia.assert<"pending" | "approved" | "rejected">(
        updatedShipment.seller.approval_status,
      ),
      rejection_reason: updatedShipment.seller.rejection_reason ?? null,
      account_status: typia.assert<"active" | "suspended" | "banned">(
        updatedShipment.seller.account_status,
      ),
      created_at: toISOStringSafe(updatedShipment.seller.created_at),
    },
    order_items: await ArrayUtil.asyncMap(shipmentOrderItems, async (item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      status: item.status,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      order: {
        id: item.order.id,
        orderNumber: item.order.order_number,
        status: item.order.status,
        totalPrice: item.order.total_price,
        createdAt: toISOStringSafe(item.order.created_at),
        itemCount: shipmentOrderItems.filter(
          (oi) => oi.ecommerce_mall_order_id === item.ecommerce_mall_order_id,
        ).length,
        customer: {
          id: customer!.id,
          email: customer!.email,
          display_name: customer!.display_name,
          phone_number: customer!.phone_number,
          account_status: typia.assert<"active" | "suspended" | "banned">(
            customer!.account_status,
          ),
          created_at: toISOStringSafe(customer!.created_at),
        },
      },
      productVariant: {
        id: item.productVariant.id,
        sku_code: item.productVariant.sku_code,
        price: item.productVariant.price ?? null,
        stock_quantity: item.productVariant.stock_quantity,
        option_values: {},
      },
    })),
    created_at: toISOStringSafe(updatedShipment.created_at),
    updated_at: toISOStringSafe(updatedShipment.updated_at),
    deleted_at: updatedShipment.deleted_at
      ? toISOStringSafe(updatedShipment.deleted_at)
      : null,
  } satisfies IEcommerceMallShipment;
}
