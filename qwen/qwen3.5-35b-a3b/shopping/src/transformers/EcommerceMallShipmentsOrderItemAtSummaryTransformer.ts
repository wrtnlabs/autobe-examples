import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentsOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipments_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shipped_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
            trackingCodes: true,
            order: {
              select: {
                id: true,
                order_number: true,
                total_price: true,
                status: true,
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
                created_at: true,
                deleted_at: true,
              },
            },
          },
        },
        orderItem: {
          select: {
            id: true,
            product_name: true,
            product_sku: true,
            variant_name: true,
            quantity: true,
            unit_price: true,
            total_price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            order: {
              select: {
                id: true,
                order_number: true,
                total_price: true,
                status: true,
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
                created_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_shipments_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentsOrderItem.ISummary> {
    const shippingAddress = input.shipment.order.shippingAddress;
    const orderItemShippingAddress = input.orderItem.order.shippingAddress;
    return {
      id: input.id,
      shipped_quantity: input.shipped_quantity,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at:
        input.deleted_at === null ? null : input.deleted_at.toISOString(),
      shipment: {
        id: input.shipment.id,
        carrierName:
          input.shipment.carrier_name === null
            ? undefined
            : input.shipment.carrier_name,
        carrierPhone:
          input.shipment.carrier_phone === null
            ? undefined
            : input.shipment.carrier_phone,
        carrierWebsite:
          input.shipment.carrier_website === null
            ? undefined
            : input.shipment.carrier_website,
        status: input.shipment.status,
        shippedAt:
          input.shipment.shipped_at === null
            ? undefined
            : input.shipment.shipped_at.toISOString(),
        deliveredAt:
          input.shipment.delivered_at === null
            ? undefined
            : input.shipment.delivered_at.toISOString(),
        estimatedDeliveryAt:
          input.shipment.estimated_delivery_at === null
            ? undefined
            : input.shipment.estimated_delivery_at.toISOString(),
        order: {
          id: input.shipment.order.id,
          order_number: input.shipment.order.order_number,
          total_price: input.shipment.order.total_price,
          status: input.shipment.order.status,
          shipping_address: {
            id: shippingAddress.id,
            recipient_name: shippingAddress.recipient_name,
            recipient_phone: shippingAddress.recipient_phone,
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            is_default: shippingAddress.is_default,
            created_at: shippingAddress.created_at.toISOString(),
            updated_at: shippingAddress.updated_at.toISOString(),
            deleted_at:
              shippingAddress.deleted_at === null
                ? null
                : shippingAddress.deleted_at.toISOString(),
          },
          created_at: input.shipment.order.created_at.toISOString(),
          deleted_at:
            input.shipment.order.deleted_at === null
              ? null
              : input.shipment.order.deleted_at.toISOString(),
        },
        trackingCount: input.shipment.trackingCodes.length,
      },
      orderItem: {
        id: input.orderItem.id,
        productName: input.orderItem.product_name,
        productSku: input.orderItem.product_sku,
        variantName: input.orderItem.variant_name,
        quantity: input.orderItem.quantity,
        unitPrice: input.orderItem.unit_price,
        totalPrice: input.orderItem.total_price,
        status: "paid" as const,
        order: {
          id: input.orderItem.order.id,
          order_number: input.orderItem.order.order_number,
          total_price: input.orderItem.order.total_price,
          status: input.orderItem.order.status,
          shipping_address: {
            id: orderItemShippingAddress.id,
            recipient_name: orderItemShippingAddress.recipient_name,
            recipient_phone: orderItemShippingAddress.recipient_phone,
            street: orderItemShippingAddress.street,
            city: orderItemShippingAddress.city,
            state: orderItemShippingAddress.state,
            is_default: orderItemShippingAddress.is_default,
            created_at: orderItemShippingAddress.created_at.toISOString(),
            updated_at: orderItemShippingAddress.updated_at.toISOString(),
            deleted_at:
              orderItemShippingAddress.deleted_at === null
                ? null
                : orderItemShippingAddress.deleted_at.toISOString(),
          },
          created_at: input.orderItem.order.created_at.toISOString(),
          deleted_at:
            input.orderItem.order.deleted_at === null
              ? null
              : input.orderItem.order.deleted_at.toISOString(),
        },
        createdAt: input.orderItem.created_at.toISOString(),
        updatedAt: input.orderItem.updated_at.toISOString(),
        deletedAt:
          input.orderItem.deleted_at === null
            ? null
            : input.orderItem.deleted_at.toISOString(),
      },
    };
  }
}
