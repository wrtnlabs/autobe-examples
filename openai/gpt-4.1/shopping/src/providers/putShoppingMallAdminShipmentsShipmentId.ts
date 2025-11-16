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

export async function putShoppingMallAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const existing = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!existing) {
    throw new HttpException("Shipment not found", 404);
  }

  const currentStatus = existing.status;
  const newStatus = props.body.status ?? currentStatus;
  const statusTransitions: Record<string, string[]> = {
    pending: ["ready", "cancelled"],
    ready: ["picked_up", "cancelled"],
    picked_up: ["in_transit", "cancelled"],
    in_transit: ["delivered", "cancelled", "returned"],
    delivered: ["returned"],
    cancelled: [],
    returned: [],
  };
  const allowedNext = statusTransitions[currentStatus] ?? [];
  if (
    props.body.status &&
    props.body.status !== currentStatus &&
    !allowedNext.includes(props.body.status)
  ) {
    throw new HttpException(
      `Invalid status transition from '${currentStatus}' to '${props.body.status}'`,
      400,
    );
  }
  if (props.body.status === "delivered" && !props.body.delivery_at) {
    throw new HttpException(
      "delivery_at must be set when setting status to 'delivered'",
      400,
    );
  }
  if (props.body.status === "cancelled" && !props.body.cancelled_at) {
    throw new HttpException(
      "cancelled_at must be set when setting status to 'cancelled'",
      400,
    );
  }
  if (props.body.updated_by_admin_id && props.body.updated_by_seller_id) {
    throw new HttpException(
      "Cannot attribute update to both admin and seller",
      400,
    );
  }

  const data: Record<string, unknown> = {
    carrier_tracking_code: props.body.carrier_tracking_code ?? null,
    status: props.body.status ?? currentStatus,
    manifest_url: props.body.manifest_url ?? null,
    provider_response_code: props.body.provider_response_code ?? null,
    delivery_at: props.body.delivery_at ?? null,
    cancelled_at: props.body.cancelled_at ?? null,
    updated_by_admin_id: props.admin.id,
    updated_by_seller_id: null,
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data,
  });

  const [order, orderItem, shippingPartner, admin, seller] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: updated.order_id },
    }),
    MyGlobal.prisma.shopping_mall_order_items.findUnique({
      where: { id: updated.order_item_id },
    }),
    MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { id: updated.shipping_partner_id },
    }),
    updated.created_by_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: updated.created_by_admin_id },
        })
      : null,
    updated.created_by_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.created_by_seller_id },
        })
      : null,
  ]);

  let skuSummary: IShoppingMallProductSku.ISummary | undefined = undefined;
  if (orderItem && orderItem.shopping_mall_product_sku_id) {
    const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: orderItem.shopping_mall_product_sku_id },
    });
    if (!sku) {
      throw new HttpException("Product SKU not found for order item", 404);
    }
    skuSummary = {
      id: sku.id,
      code: sku.sku_code,
      product_title: "",
      option_summary: "",
      in_stock: sku.stock > 0,
    };
  }

  return {
    id: updated.id,
    order: order
      ? {
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
        }
      : (null as never),
    orderItem: orderItem
      ? {
          id: orderItem.id,
          shopping_mall_order_id: orderItem.shopping_mall_order_id,
          sku: skuSummary!,
          quantity: orderItem.quantity,
          unit_price: orderItem.unit_price,
          subtotal: orderItem.subtotal,
          currency: orderItem.currency,
          delivered: orderItem.delivered,
          refunded: orderItem.refunded,
          created_at: toISOStringSafe(orderItem.created_at),
          updated_at: toISOStringSafe(orderItem.updated_at),
        }
      : (null as never),
    shippingPartner: shippingPartner
      ? {
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
        }
      : (null as never),
    carrier_tracking_code: updated.carrier_tracking_code ?? undefined,
    status: typia.assert<IShoppingMallShipment["status"]>(updated.status),
    manifest_url: updated.manifest_url ?? undefined,
    provider_response_code: updated.provider_response_code ?? undefined,
    createdByAdmin: admin
      ? { id: admin.id, name: admin.name, email: admin.email }
      : undefined,
    createdBySeller: seller
      ? { id: seller.id, business_name: seller.business_name }
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    delivery_at:
      updated.delivery_at != null
        ? toISOStringSafe(updated.delivery_at)
        : undefined,
    cancelled_at:
      updated.cancelled_at != null
        ? toISOStringSafe(updated.cancelled_at)
        : undefined,
  };
}
