import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallDeliveryEventAtInvertTransformer {
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
            tracking_number: true,
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_delivery_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDeliveryEvent.IInvert> {
    return {
      id: input.id,
      tracking_number: input.orderShipment.tracking_number,
      event_type: input.status,
      event_timestamp: toISOStringSafe(input.status_time),
      location: input.orderShipment.location ?? "",
      status_description: input.notes ?? "",
      carrier_code: input.carrier_update ?? "",
      created_at: toISOStringSafe(input.created_at),
      delivery_tracking_id: input.orderShipment.id,
    };
  }
}
