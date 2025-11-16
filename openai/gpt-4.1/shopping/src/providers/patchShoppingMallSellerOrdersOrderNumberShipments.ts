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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderNumberShipments(props: {
  seller: SellerPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment.ISummary> {
  // Look up order by business order number (must belong to seller, not deleted)
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or not accessible.", 404);
  }

  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const shipmentWhere = {
    shopping_mall_order_id: order.id,
    deleted_at: null as null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.tracking_number && {
      tracking_number: props.body.tracking_number,
    }),
    ...(props.body.shipping_partner_id && {
      shopping_mall_shipping_partner_id: props.body.shipping_partner_id,
    }),
    ...(props.body.start_created_at || props.body.end_created_at
      ? {
          created_at: {
            ...(props.body.start_created_at && {
              gte: props.body.start_created_at,
            }),
            ...(props.body.end_created_at && {
              lte: props.body.end_created_at,
            }),
          },
        }
      : {}),
  };

  const [total, shipments] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_shipments.count({
      where: shipmentWhere,
    }),
    MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where: shipmentWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      // No include as there is no join relation
    }),
  ]);

  // Fetch all unique shipping partner ids used in this page
  const partnerIds = Array.from(
    new Set(
      shipments
        .map((sh) => sh.shopping_mall_shipping_partner_id)
        .filter((id) => !!id),
    ),
  );
  const partnerRecords =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findMany({
      where: { id: { in: partnerIds } },
    });
  const partnerMap = new Map<string, (typeof partnerRecords)[number]>();
  for (const record of partnerRecords) partnerMap.set(record.id, record);

  const shipmentSummaries = shipments.map((shipment) => {
    const partner = shipment.shopping_mall_shipping_partner_id
      ? partnerMap.get(shipment.shopping_mall_shipping_partner_id)
      : undefined;
    return {
      id: shipment.id,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        currency: order.currency,
        created_at: toISOStringSafe(order.created_at),
        updated_at: toISOStringSafe(order.updated_at),
        deleted_at:
          order.deleted_at !== null
            ? toISOStringSafe(order.deleted_at)
            : undefined,
      },
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
        : {
            id: shipment.shopping_mall_shipping_partner_id,
            partner_name: "Unknown",
            partner_code: "",
            status: "inactive",
            description: "",
            created_at: toISOStringSafe(new Date(0)),
            updated_at: toISOStringSafe(new Date(0)),
            deleted_at: undefined,
          },
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      ship_date:
        shipment.ship_date !== null && shipment.ship_date !== undefined
          ? toISOStringSafe(shipment.ship_date)
          : undefined,
      expected_delivery_date:
        shipment.expected_delivery_date !== null &&
        shipment.expected_delivery_date !== undefined
          ? toISOStringSafe(shipment.expected_delivery_date)
          : undefined,
      delivered_at:
        shipment.delivered_at !== null && shipment.delivered_at !== undefined
          ? toISOStringSafe(shipment.delivered_at)
          : undefined,
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
    data: shipmentSummaries,
  };
}
