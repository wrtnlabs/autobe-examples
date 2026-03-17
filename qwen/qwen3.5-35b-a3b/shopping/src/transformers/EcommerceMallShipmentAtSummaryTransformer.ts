import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        _count: {
          select: {
            trackingCodes: true,
          },
        },
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
      shippedAt: toISOStringSafe(
        input.shipped_at ?? new Date("1970-01-01T00:00:00.000Z"),
      ),
      deliveredAt: toISOStringSafe(
        input.delivered_at ?? new Date("1970-01-01T00:00:00.000Z"),
      ),
      estimatedDeliveryAt: toISOStringSafe(
        input.estimated_delivery_at ?? new Date("1970-01-01T00:00:00.000Z"),
      ),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      trackingCount: input._count.trackingCodes,
    };
  }
}
