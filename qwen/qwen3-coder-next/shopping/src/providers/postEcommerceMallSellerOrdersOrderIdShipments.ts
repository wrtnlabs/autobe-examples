import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      customer_id: true,
      order_status: true,
      shipping_address_id: true,
      total_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          is_suspended: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      shippingAddress: {
        select: {
          id: true,
          recipient_name: true,
          phone_number: true,
          street_address: true,
          city: true,
          state_province: true,
          postal_code: true,
          country: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customerProfile: true,
          user: true,
          orders: true,
        },
      },
      orderItems: {
        select: {
          id: true,
          seller_id: true,
          item_status: true,
        },
      },
      orderOverrides: {},
      shipments: {},
    },
  });
  if (order.order_status === "cancelled" || order.order_status === "refunded") {
    throw new HttpException("Cannot ship cancelled or refunded orders", 400);
  }
  const items = order.orderItems.filter((item) =>
    props.body.order_items.includes(item.id),
  );
  if (items.length !== props.body.order_items.length) {
    throw new HttpException(
      "One or more order items not found in this order",
      400,
    );
  }
  for (const item of items) {
    if (item.seller_id !== props.seller.id) {
      throw new HttpException(
        "You may only ship items belonging to your own shop",
        403,
      );
    }
  }
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.create({
    data: {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      carrier_name: props.body.carrier_name ?? null,
      tracking_number: props.body.tracking_number ?? null,
      order: { connect: { id: props.orderId } },
      seller: { connect: { id: props.seller.id } },
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      carrier_name: true,
      tracking_number: true,
      seller: {
        select: {
          id: true,
          shop_name: true,
          approval_status: true,
          is_suspended: true,
          created_at: true,
        },
      },
      order: {
        select: {
          id: true,
          total_price: true,
          order_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              is_suspended: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          shippingAddress: {
            select: {
              id: true,
              recipient_name: true,
              phone_number: true,
              street_address: true,
              city: true,
              state_province: true,
              postal_code: true,
              country: true,
              is_default: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              customerProfile: true,
              user: true,
              orders: true,
            },
          },
          orderItems: {
            select: {
              id: true,
              seller_id: true,
              item_status: true,
            },
          },
          orderOverrides: {},
          shipments: {},
        },
      },
      shipmentItems: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          order_item_id: true,
          shipment_id: true,
        },
      },
    },
  });
  const shipmentItems = await ArrayUtil.asyncMap(
    items,
    async (item) =>
      await MyGlobal.prisma.ecommerce_mall_shipment_items.create({
        data: {
          id: v4(),
          shipment: { connect: { id: shipment.id } },
          orderItem: { connect: { id: item.id } },
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          order_item_id: true,
          shipment_id: true,
        },
      }),
  );
  return {
    ...shipment,
    seller: {
      id: props.seller.id,
      created_at: toISOStringSafe(shipment.seller.created_at),
      shop_name: shipment.seller.shop_name,
      approval_status: shipment.seller.approval_status,
      is_suspended: shipment.seller.is_suspended,
    } satisfies IEcommerceMallSeller.ISummary,
    order: {
      id: shipment.order.id,
      created_at: toISOStringSafe(shipment.order.created_at),
      updated_at: toISOStringSafe(shipment.order.updated_at),
      deleted_at: shipment.order.deleted_at
        ? toISOStringSafe(shipment.order.deleted_at)
        : null,
      total_price: shipment.order.total_price,
      order_status: typia.assert<
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "partiallyCompleted"
      >(shipment.order.order_status),
      customer: {
        id: shipment.order.customer.id,
        email: shipment.order.customer.email,
        is_suspended: shipment.order.customer.is_suspended,
        created_at: toISOStringSafe(shipment.order.customer.created_at),
      } satisfies IEcommerceMallCustomer.ISummary,
      shippingAddress: {
        id: shipment.order.shippingAddress.id,
        created_at: toISOStringSafe(shipment.order.shippingAddress.created_at),
        updated_at: toISOStringSafe(shipment.order.shippingAddress.updated_at),
        deleted_at: shipment.order.shippingAddress.deleted_at
          ? toISOStringSafe(shipment.order.shippingAddress.deleted_at)
          : null,
        recipient_name: shipment.order.shippingAddress.recipient_name,
        phone_number: shipment.order.shippingAddress.phone_number,
        street_address: shipment.order.shippingAddress.street_address,
        city: shipment.order.shippingAddress.city,
        state_province: shipment.order.shippingAddress.state_province,
        postal_code: shipment.order.shippingAddress.postal_code,
        country: shipment.order.shippingAddress.country,
        is_default: shipment.order.shippingAddress.is_default,
        customerProfile: shipment.order.shippingAddress.customerProfile,
        user: shipment.order.shippingAddress.user,
        orders: shipment.order.shippingAddress.orders,
      } satisfies IEcommerceMallAddress.ISummary,
      orderItems: shipment.order.orderItems.map((item) => ({
        id: item.id,
        seller_id: item.seller_id,
        item_status: item.item_status,
      })),
      orderOverrides: [],
      shipments: [],
    } satisfies IEcommerceMallOrder.ISummary,
    shipmentItems: shipmentItems,
  } satisfies IEcommerceMallShipment;
}
