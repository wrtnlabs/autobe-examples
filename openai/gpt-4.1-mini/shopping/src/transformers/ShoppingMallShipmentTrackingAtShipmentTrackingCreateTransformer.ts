import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShipmentTrackingAtShipmentTrackingCreateTransformer {
  export type Payload = Prisma.shopping_mall_shipment_trackingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        carrier_name: true,
        tracking_number: true,
      },
    } satisfies Prisma.shopping_mall_shipment_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipmentTracking.IShipmentTrackingCreate> {
    return {
      shipment_id: input.shopping_mall_shipment_id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
    };
  }
}
