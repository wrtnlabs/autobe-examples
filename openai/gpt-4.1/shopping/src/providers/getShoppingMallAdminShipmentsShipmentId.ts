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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    include: {
      order: true,
      orderItem: {
        include: { sku: true },
      },
      shippingPartner: true,
      createdByAdmin: true,
      createdBySeller: true,
    },
  });

  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (!shipment.orderItem?.sku) {
    throw new HttpException("Order item SKU missing", 500);
  }

  // Build SKU summary using only available fields
  const skuSummary: IShoppingMallProductSku.ISummary = {
    id: shipment.orderItem.sku.id,
    code: shipment.orderItem.sku.sku_code,
    product_title: "", // No product_title on SKU; left blank
    option_summary: "", // No option_summary on SKU; left blank
    in_stock: false, // No in_stock field; default false
  };

  const orderItemSummary: IShoppingMallOrderItem.ISummary = {
    id: shipment.orderItem.id,
    shopping_mall_order_id: shipment.orderItem.shopping_mall_order_id,
    sku: skuSummary,
    quantity: shipment.orderItem.quantity,
    unit_price: shipment.orderItem.unit_price,
    subtotal: shipment.orderItem.subtotal,
    currency: shipment.orderItem.currency,
    delivered: shipment.orderItem.delivered,
    refunded: shipment.orderItem.refunded,
    created_at: toISOStringSafe(shipment.orderItem.created_at),
    updated_at: toISOStringSafe(shipment.orderItem.updated_at),
  };

  const orderSummary: IShoppingMallOrder.ISummary = {
    id: shipment.order.id,
    order_number: shipment.order.order_number,
    status: shipment.order.status,
    total_amount: shipment.order.total_amount,
    currency: shipment.order.currency,
    created_at: toISOStringSafe(shipment.order.created_at),
    updated_at: toISOStringSafe(shipment.order.updated_at),
    deleted_at: shipment.order.deleted_at
      ? toISOStringSafe(shipment.order.deleted_at)
      : undefined,
  };

  const partnerSummary: IShoppingMallShippingPartner.ISummary = {
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
  };
  const createdByAdminSummary = shipment.createdByAdmin
    ? {
        id: shipment.createdByAdmin.id,
        name: shipment.createdByAdmin.name,
        email: shipment.createdByAdmin.email,
      }
    : null;
  const createdBySellerSummary = shipment.createdBySeller
    ? {
        id: shipment.createdBySeller.id,
        business_name: shipment.createdBySeller.business_name,
      }
    : null;

  return {
    id: shipment.id,
    order: orderSummary,
    orderItem: orderItemSummary,
    shippingPartner: partnerSummary,
    carrier_tracking_code:
      shipment.carrier_tracking_code === null
        ? null
        : shipment.carrier_tracking_code,
    status: typia.assert<
      | "delivered"
      | "pending"
      | "ready"
      | "picked_up"
      | "in_transit"
      | "cancelled"
      | "returned"
    >(shipment.status),
    manifest_url: shipment.manifest_url === null ? null : shipment.manifest_url,
    provider_response_code:
      shipment.provider_response_code === null
        ? null
        : shipment.provider_response_code,
    createdByAdmin: createdByAdminSummary,
    createdBySeller: createdBySellerSummary,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    delivery_at: shipment.delivery_at
      ? toISOStringSafe(shipment.delivery_at)
      : null,
    cancelled_at: shipment.cancelled_at
      ? toISOStringSafe(shipment.cancelled_at)
      : null,
  };
}
