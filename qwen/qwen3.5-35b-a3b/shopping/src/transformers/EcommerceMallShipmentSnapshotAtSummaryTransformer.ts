import { IEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        carrier_name: true,
        carrier_contact: true,
        status: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        shipped_date: true,
        tracking_url: true,
        shipping_method: true,
        weight_kg: true,
        dimensions_length_cm: true,
        dimensions_width_cm: true,
        dimensions_height_cm: true,
        delivery_address: true,
        signature_required: true,
        signature_obtained: true,
        delivery_notes: true,
        exception_description: true,
        created_at: true,
        shipment: true,
      },
    } satisfies Prisma.ecommerce_mall_shipment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentSnapshot.ISummary> {
    const FUTURE_DATE = new Date("9999-12-31T23:59:59.999Z");
    return {
      id: input.id,
      tracking_number: input.tracking_number,
      carrier_name: input.carrier_name,
      status: input.status,
      estimated_delivery_date: toISOStringSafe(
        input.estimated_delivery_date ?? FUTURE_DATE,
      ),
      actual_delivery_date: toISOStringSafe(
        input.actual_delivery_date ?? FUTURE_DATE,
      ),
      ecommerce_mall_shipment_id: input.shipment.id,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
