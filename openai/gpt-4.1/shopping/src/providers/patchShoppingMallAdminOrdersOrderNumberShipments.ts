import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderNumberShipments(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  // Clamp pagination
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  let limitFallback = 20;
  if (typeof props.body.limit === "number") {
    if (props.body.limit < 1) limitFallback = 1;
    else if (props.body.limit > 100) limitFallback = 100;
    else limitFallback = props.body.limit;
  }
  const limit = limitFallback;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_order_id: order.id,
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.tracking_number
      ? { tracking_number: props.body.tracking_number }
      : {}),
    ...(props.body.shipping_partner_id
      ? { shopping_mall_shipping_partner_id: props.body.shipping_partner_id }
      : {}),
    ...(props.body.start_created_at || props.body.end_created_at
      ? {
          created_at: {
            ...(props.body.start_created_at
              ? { gte: props.body.start_created_at }
              : {}),
            ...(props.body.end_created_at
              ? { lte: props.body.end_created_at }
              : {}),
          },
        }
      : {}),
  };

  const [shipments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        shippingPartner: true,
        order: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_shipments.count({ where }),
  ]);

  const data = shipments.map((shipment) => ({
    id: shipment.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at
        ? toISOStringSafe(order.deleted_at)
        : undefined,
    },
    shipping_partner: {
      id: shipment.shippingPartner.id,
      partner_name: shipment.shippingPartner.partner_name,
      partner_code: shipment.shippingPartner.partner_code,
      status: shipment.shippingPartner.status,
      description: shipment.shippingPartner.description,
      created_at: toISOStringSafe(shipment.shippingPartner.created_at),
      updated_at: toISOStringSafe(shipment.shippingPartner.updated_at),
      deleted_at: shipment.shippingPartner.deleted_at
        ? toISOStringSafe(shipment.shippingPartner.deleted_at)
        : undefined,
    },
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    ship_date: shipment.ship_date
      ? toISOStringSafe(shipment.ship_date)
      : undefined,
    expected_delivery_date: shipment.expected_delivery_date
      ? toISOStringSafe(shipment.expected_delivery_date)
      : undefined,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
