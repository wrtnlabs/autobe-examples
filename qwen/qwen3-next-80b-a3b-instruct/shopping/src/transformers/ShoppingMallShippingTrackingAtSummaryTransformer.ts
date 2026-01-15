import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingTrackingAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipping_trackingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        created_at: true,
        updated_at: true,
        orderShipment: {
          select: {
            id: true,
            carrier: true,
            status: true,
            estimated_delivery_date: true,
            actual_delivery_date: true,
            location: true,
            carrier_tracking_url: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_shipping_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShippingTracking.ISummary> {
    return {
      id: input.id,
      tracking_number: input.tracking_number,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      order_id: input.orderShipment.id,
      carrier: input.orderShipment.carrier,
      status: input.orderShipment.status,
      estimated_delivery_date: input.orderShipment.estimated_delivery_date
        ? toISOStringSafe(input.orderShipment.estimated_delivery_date)
        : undefined,
      actual_delivery_date: input.orderShipment.actual_delivery_date
        ? toISOStringSafe(input.orderShipment.actual_delivery_date)
        : null,
      location: input.orderShipment.location,
      carrier_tracking_url: input.orderShipment.carrier_tracking_url,
    };
  }
}
