import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoordinates";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCoordinatesTransformer {
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
        orderShipment: true,
      },
    } satisfies Prisma.shopping_mall_delivery_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCoordinates> {
    return {
      latitude: 0.0, // Sentinel value for missing geographic data in database
      longitude: 0.0, // Sentinel value for missing geographic data in database
    };
  }
}
