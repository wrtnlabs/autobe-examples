import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const { body, admin } = props;

  // 1. Validate referenced entities exist
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: body.order_id },
  });
  if (!order) {
    throw new HttpException("Referenced order does not exist.", 404);
  }

  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: body.order_item_id },
  });
  if (!orderItem) {
    throw new HttpException("Referenced order item does not exist.", 404);
  }

  const shippingPartner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: {
        id: body.shipping_partner_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!shippingPartner) {
    throw new HttpException(
      "Referenced shipping partner does not exist or is not active.",
      404,
    );
  }

  // 2. Enforce actor attribution rules (admin only for this endpoint)
  if (body.created_by_admin_id !== admin.id) {
    throw new HttpException(
      "created_by_admin_id must match current admin.",
      400,
    );
  }
  if (body.created_by_seller_id) {
    throw new HttpException(
      "created_by_seller_id must be null for admin-attributed shipment.",
      400,
    );
  }

  // 3. Generate new shipment ID and timestamps
  const id = v4();
  const now = toISOStringSafe(new Date());

  // 4. Insert the shipment record
  const created = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id,
      order_id: body.order_id,
      order_item_id: body.order_item_id,
      shipping_partner_id: body.shipping_partner_id,
      carrier_tracking_code: body.carrier_tracking_code ?? null,
      status: body.status,
      manifest_url: body.manifest_url ?? null,
      provider_response_code: body.provider_response_code ?? null,
      created_by_admin_id: body.created_by_admin_id ?? admin.id,
      created_by_seller_id: null,
      created_at: now,
      updated_at: now,
      delivery_at: body.status === "delivered" ? now : null,
      cancelled_at: body.status === "cancelled" ? now : null,
    },
  });

  // 5. Compose summary references for response DTO
  const orderSummary = {
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
  };

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: orderItem.shopping_mall_product_sku_id },
  });
  const skuSummary = sku
    ? {
        id: sku.id satisfies string as string,
        code: sku.sku_code ?? "",
        product_title: "", // Not in schema
        option_summary: "", // Not in schema
        in_stock: false, // Not in schema
      }
    : {
        id: "",
        code: "",
        product_title: "",
        option_summary: "",
        in_stock: false,
      };

  const orderItemSummary = {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    sku: skuSummary,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    subtotal: orderItem.subtotal,
    currency: orderItem.currency,
    delivered: orderItem.delivered,
    refunded: orderItem.refunded,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
  };

  const shippingPartnerSummary = {
    id: shippingPartner.id,
    partner_name: shippingPartner.partner_name,
    partner_code: shippingPartner.partner_code,
    status: shippingPartner.status,
    description: shippingPartner.description,
    created_at: toISOStringSafe(shippingPartner.created_at),
    updated_at: toISOStringSafe(shippingPartner.updated_at),
    deleted_at: shippingPartner.deleted_at
      ? toISOStringSafe(shippingPartner.deleted_at)
      : undefined,
  };

  const adminSummary = {
    id: admin.id,
    name: "",
    email: "",
  };

  return {
    id,
    order: orderSummary,
    orderItem: orderItemSummary,
    shippingPartner: shippingPartnerSummary,
    carrier_tracking_code: created.carrier_tracking_code ?? undefined,
    status: typia.assert<IShoppingMallShipment["status"]>(created.status),
    manifest_url: created.manifest_url ?? undefined,
    provider_response_code: created.provider_response_code ?? undefined,
    createdByAdmin: adminSummary,
    createdBySeller: null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    delivery_at:
      created.delivery_at != null
        ? toISOStringSafe(created.delivery_at)
        : undefined,
    cancelled_at:
      created.cancelled_at != null
        ? toISOStringSafe(created.cancelled_at)
        : undefined,
  };
}
