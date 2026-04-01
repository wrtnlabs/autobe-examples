import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";

export namespace EcommerceMallShipmentSnapshotTransformer {
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
        shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shipment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentSnapshot> {
    return {
      id: input.id,
      tracking_number: input.tracking_number,
      carrier_name: input.carrier_name ?? undefined,
      carrier_contact: input.carrier_contact ?? undefined,
      status: input.status,
      estimated_delivery_date:
        input.estimated_delivery_date?.toISOString() ?? null,
      actual_delivery_date: input.actual_delivery_date?.toISOString() ?? null,
      shipped_date: input.shipped_date?.toISOString() ?? null,
      tracking_url: input.tracking_url ?? undefined,
      shipping_method: input.shipping_method ?? undefined,
      weight_kg: input.weight_kg ?? undefined,
      dimensions_length_cm: input.dimensions_length_cm ?? undefined,
      dimensions_width_cm: input.dimensions_width_cm ?? undefined,
      dimensions_height_cm: input.dimensions_height_cm ?? undefined,
      delivery_address: input.delivery_address ?? undefined,
      signature_required: input.signature_required ?? undefined,
      signature_obtained: input.signature_obtained ?? undefined,
      delivery_notes: input.delivery_notes ?? undefined,
      exception_description: input.exception_description ?? undefined,
      shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallShipmentSnapshot;
  }
}
