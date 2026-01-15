import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderShipmentTransformer {
  export type Payload = Prisma.shopping_mall_order_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        package_weight: true,
        package_dimensions: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            code: true,
          },
        },
        carrier: {
          select: {
            label: true,
          },
        },
        shopping_mall_shipping_trackings: {
          select: {
            id: true,
            tracking_number: true,
            status: true,
          },
        },
        shopping_mall_delivery_events: {
          select: {
            id: true,
            event_type: true,
            timestamp: true,
            location: true,
          },
        },
        carrier_id: true,
        shipping_method_id: true,
        shipping_address_id: true,
        status: true,
      },
    } satisfies Prisma.shopping_mall_order_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderShipment> {
    return {
      id: input.id,
      order_code: input.order.code,
      carrier_id: input.carrier_id,
      shipping_method_id: input.shipping_method_id,
      tracking_number: input.tracking_number,
      status: input.status,
      estimated_delivery_date:
        input.estimated_delivery_date?.toISOString() ?? undefined,
      shipping_address_id: input.shipping_address_id,
      created_at: input.created_at.toISOString(),
      carrier: input.carrier.label,
    };
  }
}
