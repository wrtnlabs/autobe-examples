import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";
import { IShoppingMallCoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoordinates";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCoordinatesTransformer } from "./ShoppingMallCoordinatesTransformer";

export namespace ShoppingMallDeliveryEventTransformer {
  export type Payload = Prisma.shopping_mall_delivery_eventsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        notes: true,
        carrier_update: true,
        status_time: true,
        created_at: true,
        orderShipment: {
          select: {
            order_id: true,
            location: true,
            delivery_attempt_number: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_delivery_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDeliveryEvent> {
    return {
      id: input.id,
      order_id: input.orderShipment.order_id,
      status: input.status satisfies string as
        | "delivered"
        | "cancelled"
        | "returned"
        | "in_transit"
        | "out_for_delivery"
        | "picked_up"
        | "attempt_failed",
      location: input.orderShipment.location,
      coordinates: await ShoppingMallCoordinatesTransformer.transform(
        input.orderShipment,
      ),
      note: input.notes ?? "",
      delivery_attempt_number: input.orderShipment.delivery_attempt_number,
      carrier_notes: input.carrier_update ?? "",
    };
  }
}
