import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.order_id },
  });
  if (!order) {
    throw new HttpException("Order not found.", 404);
  }

  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.order_item_id },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found.", 404);
  }
  if (orderItem.shopping_mall_order_id !== props.body.order_id) {
    throw new HttpException(
      "Order item does not belong to the specified order.",
      409,
    );
  }

  const partner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { id: props.body.shipping_partner_id },
    });
  if (!partner || partner.status !== "active" || partner.deleted_at !== null) {
    throw new HttpException("Shipping partner is not available.", 400);
  }

  if (props.body.created_by_admin_id) {
    throw new HttpException(
      "Sellers cannot create admin-attributed shipments.",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const shipment = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: v4(),
      order_id: props.body.order_id,
      order_item_id: props.body.order_item_id,
      shipping_partner_id: props.body.shipping_partner_id,
      carrier_tracking_code: props.body.carrier_tracking_code ?? null,
      status: props.body.status,
      manifest_url: props.body.manifest_url ?? null,
      provider_response_code: props.body.provider_response_code ?? null,
      created_by_admin_id: null,
      created_by_seller_id: props.seller.id,
      created_at: now,
      updated_at: now,
      delivery_at: props.body.status === "delivered" ? now : null,
      cancelled_at: props.body.status === "cancelled" ? now : null,
    },
  });

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: orderItem.shopping_mall_product_sku_id },
  });
  if (!sku) {
    throw new HttpException("SKU not found.", 404);
  }

  const sellerEntity = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
  });

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
        order.deleted_at !== null && order.deleted_at !== undefined
          ? toISOStringSafe(order.deleted_at)
          : undefined,
    },
    orderItem: {
      id: orderItem.id,
      shopping_mall_order_id: orderItem.shopping_mall_order_id,
      sku: {
        id: sku.id,
        code: sku.sku_code,
        product_title: "",
        option_summary: "",
        in_stock: sku.stock > 0,
      },
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      subtotal: orderItem.subtotal,
      currency: orderItem.currency,
      delivered: orderItem.delivered,
      refunded: orderItem.refunded,
      created_at: toISOStringSafe(orderItem.created_at),
      updated_at: toISOStringSafe(orderItem.updated_at),
    },
    shippingPartner: {
      id: partner.id,
      partner_name: partner.partner_name,
      partner_code: partner.partner_code,
      status: partner.status,
      description: partner.description,
      created_at: toISOStringSafe(partner.created_at),
      updated_at: toISOStringSafe(partner.updated_at),
      deleted_at:
        partner.deleted_at !== null && partner.deleted_at !== undefined
          ? toISOStringSafe(partner.deleted_at)
          : undefined,
    },
    carrier_tracking_code:
      shipment.carrier_tracking_code !== null &&
      shipment.carrier_tracking_code !== undefined
        ? shipment.carrier_tracking_code
        : undefined,
    status: typia.assert<
      | "delivered"
      | "pending"
      | "ready"
      | "picked_up"
      | "in_transit"
      | "cancelled"
      | "returned"
    >(shipment.status),
    manifest_url:
      shipment.manifest_url !== null && shipment.manifest_url !== undefined
        ? shipment.manifest_url
        : undefined,
    provider_response_code:
      shipment.provider_response_code !== null &&
      shipment.provider_response_code !== undefined
        ? shipment.provider_response_code
        : undefined,
    createdByAdmin: undefined,
    createdBySeller: sellerEntity
      ? {
          id: sellerEntity.id,
          business_name: sellerEntity.business_name,
        }
      : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    delivery_at:
      shipment.delivery_at !== null && shipment.delivery_at !== undefined
        ? toISOStringSafe(shipment.delivery_at)
        : undefined,
    cancelled_at:
      shipment.cancelled_at !== null && shipment.cancelled_at !== undefined
        ? toISOStringSafe(shipment.cancelled_at)
        : undefined,
  };
}
