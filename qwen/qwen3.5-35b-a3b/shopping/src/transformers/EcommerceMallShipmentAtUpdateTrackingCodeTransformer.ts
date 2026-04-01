import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentTrackingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingCode";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentAtUpdateTrackingCodeTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        carrier_phone: true,
        carrier_website: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        estimated_delivery_at: true,
        delivery_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: true,
        seller: true,
        orderItems: true,
        snapshots: true,
        trackingUpdates: true,
        trackingCodes: true,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.IUpdateTrackingCode> {
    return {
      tracking_codes: input.trackingCodes.map((tc) => ({
        carrierName: tc.carrier_name,
        trackingCode: tc.tracking_code,
      })),
      carrier_name: input.carrier_name ?? undefined,
      carrier_phone: input.carrier_phone ?? undefined,
      carrier_website: input.carrier_website ?? undefined,
    };
  }
}
