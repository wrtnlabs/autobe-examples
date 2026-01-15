import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallDeliveryEventAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_delivery_eventsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        status_time: true,
        carrier_update: true,
        notes: true,
        created_at: true,
        orderShipment: {
          select: {
            orderId: true,
            carrierId: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_delivery_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDeliveryEvent.ISummary> {
    return {
      id: input.id,
      order_id: input.orderShipment.orderId,
      carrier_id: input.orderShipment.carrierId,
      scheduled_delivery_date: undefined,
      actual_delivery_date: toISOStringSafe(input.status_time),
      delivery_status: input.status,
      tracking_number: input.carrier_update ?? undefined,
      estimated_delivery_window_start: undefined,
      estimated_delivery_window_end: undefined,
      delivery_address: undefined,
      delivery_notes: input.notes ?? undefined,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
