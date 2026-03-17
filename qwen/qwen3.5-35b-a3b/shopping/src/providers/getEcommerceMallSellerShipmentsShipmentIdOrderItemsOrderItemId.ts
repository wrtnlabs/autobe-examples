import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
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

export async function getEcommerceMallSellerShipmentsShipmentIdOrderItemsOrderItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentsOrderItem> {
  // Step 1: Verify the junction record exists and shipment belongs to this seller
  const junctionRecord =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findFirst({
      where: {
        id: props.orderItemId,
        ecommerce_mall_shipment_id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        shipped_quantity: true,
        orderItem: {
          select: {
            unit_price: true,
            total_price: true,
            product_name: true,
            product_sku: true,
            variant_name: true,
            ecommerce_mall_order_id: true,
          },
        },
        shipment: {
          select: {
            id: true,
            carrier_name: true,
            carrier_phone: true,
            carrier_website: true,
            status: true,
            shipped_at: true,
            delivered_at: true,
            estimated_delivery_at: true,
            created_at: true,
            deleted_at: true,
            ecommerce_mall_seller_id: true,
            trackingCodes: {
              select: { id: true },
            },
          },
        },
      },
    });
  if (junctionRecord === null) {
    throw new HttpException("Not found", 404);
  }
  // Step 2: Verify shipment belongs to the authenticated seller
  if (junctionRecord.shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Fetch order with shipping address for order context
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: {
      id: junctionRecord.orderItem.ecommerce_mall_order_id,
      deleted_at: null,
    },
    select: {
      id: true,
      order_number: true,
      total_price: true,
      status: true,
      created_at: true,
      deleted_at: true,
      shippingAddress: {
        select: {
          id: true,
          recipient_name: true,
          recipient_phone: true,
          street: true,
          city: true,
          state: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (order === null) {
    throw new HttpException("Not found", 404);
  }
  // Step 4: Construct and return response DTO
  return {
    id: junctionRecord.id,
    quantity: junctionRecord.shipped_quantity,
    unit_price: junctionRecord.orderItem.unit_price,
    total_price: junctionRecord.orderItem.total_price,
    product_name: junctionRecord.orderItem.product_name,
    product_sku: junctionRecord.orderItem.product_sku,
    variant_name: junctionRecord.orderItem.variant_name,
    shipment: {
      id: junctionRecord.shipment.id,
      carrierName: junctionRecord.shipment.carrier_name ?? undefined,
      carrierPhone: junctionRecord.shipment.carrier_phone ?? undefined,
      carrierWebsite: junctionRecord.shipment.carrier_website ?? undefined,
      status: junctionRecord.shipment.status,
      shippedAt: junctionRecord.shipment.shipped_at?.toISOString(),
      deliveredAt: junctionRecord.shipment.delivered_at?.toISOString(),
      estimatedDeliveryAt:
        junctionRecord.shipment.estimated_delivery_at?.toISOString(),
      order: {
        id: order.id,
        order_number: order.order_number,
        total_price: order.total_price,
        status: order.status,
        shipping_address: {
          id: order.shippingAddress.id,
          recipient_name: order.shippingAddress.recipient_name,
          recipient_phone: order.shippingAddress.recipient_phone,
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          is_default: order.shippingAddress.is_default,
          created_at: order.shippingAddress.created_at.toISOString(),
          updated_at: order.shippingAddress.updated_at.toISOString(),
          deleted_at: order.shippingAddress.deleted_at?.toISOString() ?? null,
        } satisfies IEcommerceMallAddress.ISummary,
        created_at: order.created_at.toISOString(),
        deleted_at: order.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallOrder.ISummary,
      trackingCount: junctionRecord.shipment.trackingCodes.length,
    } satisfies IEcommerceMallShipment.ISummary,
    order: {
      id: order.id,
      order_number: order.order_number,
      total_price: order.total_price,
      status: order.status,
      shipping_address: {
        id: order.shippingAddress.id,
        recipient_name: order.shippingAddress.recipient_name,
        recipient_phone: order.shippingAddress.recipient_phone,
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        is_default: order.shippingAddress.is_default,
        created_at: order.shippingAddress.created_at.toISOString(),
        updated_at: order.shippingAddress.updated_at.toISOString(),
        deleted_at: order.shippingAddress.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallAddress.ISummary,
      created_at: order.created_at.toISOString(),
      deleted_at: order.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallOrder.ISummary,
  } satisfies IEcommerceMallShipmentsOrderItem;
}
