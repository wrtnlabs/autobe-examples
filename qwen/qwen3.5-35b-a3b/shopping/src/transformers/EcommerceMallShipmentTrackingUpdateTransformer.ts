import { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentTrackingUpdateTransformer {
  export type Payload =
    Prisma.ecommerce_mall_shipment_tracking_updatesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_status: true,
        carrier_response: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: true,
      },
    } satisfies Prisma.ecommerce_mall_shipment_tracking_updatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentTrackingUpdate> {
    return {
      id: input.id,
      shipment_id: input.shipment.id,
      tracking_status: input.tracking_status,
      carrier_response: input.carrier_response ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallShipmentTrackingUpdate;
  }
}
