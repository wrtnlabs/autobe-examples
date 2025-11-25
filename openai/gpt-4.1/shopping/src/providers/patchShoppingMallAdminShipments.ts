import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {};
  if (props.body.status) where.status = props.body.status;
  if (props.body.order_id) where.order_id = props.body.order_id;
  if (props.body.order_item_id) where.order_item_id = props.body.order_item_id;
  if (props.body.shipping_partner_id)
    where.shipping_partner_id = props.body.shipping_partner_id;
  if (props.body.carrier_tracking_code)
    where.carrier_tracking_code = {
      contains: props.body.carrier_tracking_code,
    };
  if (props.body.created_by_admin_id)
    where.created_by_admin_id = props.body.created_by_admin_id;
  if (props.body.created_by_seller_id)
    where.created_by_seller_id = props.body.created_by_seller_id;
  if (props.body.provider_response_code)
    where.provider_response_code = {
      contains: props.body.provider_response_code,
    };
  if (props.body.created_from || props.body.created_to) {
    where.created_at = {};
    if (props.body.created_from) where.created_at.gte = props.body.created_from;
    if (props.body.created_to) where.created_at.lte = props.body.created_to;
  }
  if (props.body.delivery_from || props.body.delivery_to) {
    where.delivery_at = {};
    if (props.body.delivery_from)
      where.delivery_at.gte = props.body.delivery_from;
    if (props.body.delivery_to) where.delivery_at.lte = props.body.delivery_to;
  }

  let orderBy: any = { created_at: "desc" };
  if (props.body.sort_by) {
    orderBy = { [props.body.sort_by]: props.body.sort_order ?? "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        order: true,
        orderItem: { include: { sku: true } },
        shippingPartner: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      order: {
        id: row.order.id,
        order_number: row.order.order_number,
        status: row.order.status,
        total_amount: row.order.total_amount,
        currency: row.order.currency,
        created_at: toISOStringSafe(row.order.created_at),
        updated_at: toISOStringSafe(row.order.updated_at),
        deleted_at: row.order.deleted_at
          ? toISOStringSafe(row.order.deleted_at)
          : undefined,
      },
      orderItem: {
        id: row.orderItem.id,
        shopping_mall_order_id: row.orderItem.shopping_mall_order_id,
        sku: {
          id: row.orderItem.sku.id,
          code:
            row.orderItem.sku.sku_code ?? (row.orderItem.sku as any).code ?? "",
          product_title: (row.orderItem.sku as any).product_title ?? "",
          option_summary: (row.orderItem.sku as any).option_summary ?? "",
          in_stock: (row.orderItem.sku as any).in_stock ?? true,
        },
        quantity: row.orderItem.quantity,
        unit_price: row.orderItem.unit_price,
        subtotal: row.orderItem.subtotal,
        currency: row.orderItem.currency,
        delivered: row.orderItem.delivered,
        refunded: row.orderItem.refunded,
        created_at: toISOStringSafe(row.orderItem.created_at),
        updated_at: toISOStringSafe(row.orderItem.updated_at),
      },
      shippingPartner: {
        id: row.shippingPartner.id,
        partner_name: row.shippingPartner.partner_name,
        partner_code: row.shippingPartner.partner_code,
        status: row.shippingPartner.status,
        description: row.shippingPartner.description,
        created_at: toISOStringSafe(row.shippingPartner.created_at),
        updated_at: toISOStringSafe(row.shippingPartner.updated_at),
        deleted_at: row.shippingPartner.deleted_at
          ? toISOStringSafe(row.shippingPartner.deleted_at)
          : undefined,
      },
      status: typia.assert<
        | "pending"
        | "ready"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "returned"
      >(row.status),
      carrier_tracking_code:
        typeof row.carrier_tracking_code === "string"
          ? row.carrier_tracking_code
          : undefined,
      created_at: toISOStringSafe(row.created_at),
      delivery_at: row.delivery_at
        ? toISOStringSafe(row.delivery_at)
        : undefined,
    })),
  };
}
