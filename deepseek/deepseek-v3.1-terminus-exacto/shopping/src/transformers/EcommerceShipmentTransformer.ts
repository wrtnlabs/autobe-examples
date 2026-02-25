import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceShipmentTransformer {
  export type Payload = Prisma.ecommerce_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        carrier_name: true,
        shipment_status: true,
        created_at: true,
        updated_at: true,
        shipped_at: true,
        delivered_at: true,
        estimated_delivery: true,
        shipping_cost: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_shipmentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceShipment> {
    return {
      id: input.id,
      tracking_number: input.tracking_number,
      carrier_name: input.carrier_name,
      shipment_status: input.shipment_status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      shipped_at: input.shipped_at ? input.shipped_at.toISOString() : null,
      delivered_at: input.delivered_at
        ? input.delivered_at.toISOString()
        : null,
      estimated_delivery: input.estimated_delivery
        ? input.estimated_delivery.toISOString()
        : null,
      shipping_cost: input.shipping_cost ?? null,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    };
  }
}
