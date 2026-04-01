import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";

export namespace EcommerceMallShipmentAtSummaryTransformer {
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
        order: EcommerceMallOrderAtSummaryTransformer.select(),
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
  ): Promise<IEcommerceMallShipment.ISummary> {
    return {
      id: input.id,
      carrierName: input.carrier_name ?? undefined,
      carrierPhone: input.carrier_phone ?? undefined,
      carrierWebsite: input.carrier_website ?? undefined,
      status: input.status,
      shippedAt: input.shipped_at?.toISOString() ?? undefined,
      deliveredAt: input.delivered_at?.toISOString() ?? undefined,
      estimatedDeliveryAt:
        input.estimated_delivery_at?.toISOString() ?? undefined,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      trackingCount: input.trackingCodes.length,
    };
  }
}
