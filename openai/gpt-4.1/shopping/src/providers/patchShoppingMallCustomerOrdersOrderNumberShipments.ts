import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderNumberShipments(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment.ISummary> {
  // Find the order via the order_number - must belong to this customer and not soft deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    return {
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Filter construction
  const filters: Record<string, unknown> = {
    shopping_mall_order_id: order.id,
    deleted_at: null,
  };
  if (props.body.status) filters.status = props.body.status;
  if (props.body.tracking_number)
    filters.tracking_number = props.body.tracking_number;
  if (props.body.shipping_partner_id)
    filters.shopping_mall_shipping_partner_id = props.body.shipping_partner_id;
  if (props.body.start_created_at && props.body.end_created_at) {
    filters.created_at = {
      gte: props.body.start_created_at,
      lte: props.body.end_created_at,
    };
  } else if (props.body.start_created_at) {
    filters.created_at = { gte: props.body.start_created_at };
  } else if (props.body.end_created_at) {
    filters.created_at = { lte: props.body.end_created_at };
  }
  // Fetch shipment records and total in parallel
  const [shipments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_shipments.count({
      where: filters,
    }),
  ]);
  // Fetch all order and shipping partner data needed for mapping
  // (batch loading for efficiency, but only need one order and potentially one/many shipping partners)
  // Since all shipments are for this order, order summary can be built from 'order' above
  // Get all referenced shipping_partner_ids and fetch all needed
  const partnerIds = Array.from(
    new Set(shipments.map((row) => row.shopping_mall_shipping_partner_id)),
  );
  const partners =
    partnerIds.length > 0
      ? await MyGlobal.prisma.shopping_mall_shipping_partners.findMany({
          where: { id: { in: partnerIds } },
        })
      : [];
  const partnersMap = Object.fromEntries(partners.map((p) => [p.id, p]));

  const orderSummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at:
      order.deleted_at !== null ? toISOStringSafe(order.deleted_at) : undefined,
  };
  const data = shipments.map((shipment) => {
    const partner = partnersMap[shipment.shopping_mall_shipping_partner_id];
    return {
      id: shipment.id,
      order: orderSummary,
      shipping_partner: partner
        ? {
            id: partner.id,
            partner_name: partner.partner_name,
            partner_code: partner.partner_code,
            status: partner.status,
            description: partner.description,
            created_at: toISOStringSafe(partner.created_at),
            updated_at: toISOStringSafe(partner.updated_at),
            deleted_at:
              partner.deleted_at !== null
                ? toISOStringSafe(partner.deleted_at)
                : undefined,
          }
        : undefined!,
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      ship_date:
        shipment.ship_date !== null && shipment.ship_date !== undefined
          ? toISOStringSafe(shipment.ship_date)
          : null,
      expected_delivery_date:
        shipment.expected_delivery_date !== null &&
        shipment.expected_delivery_date !== undefined
          ? toISOStringSafe(shipment.expected_delivery_date)
          : null,
      delivered_at:
        shipment.delivered_at !== null && shipment.delivered_at !== undefined
          ? toISOStringSafe(shipment.delivered_at)
          : null,
      created_at: toISOStringSafe(shipment.created_at),
      updated_at: toISOStringSafe(shipment.updated_at),
      deleted_at:
        shipment.deleted_at !== null
          ? toISOStringSafe(shipment.deleted_at)
          : undefined,
    };
  });
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
