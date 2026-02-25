import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceShipmentAtSummaryTransformer {
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
        shipped_at: true,
        delivered_at: true,
        estimated_delivery: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceShipment.ISummary> {
    return {
      id: input.id,
      trackingNumber: input.tracking_number,
      carrierName: input.carrier_name,
      shipmentStatus: input.shipment_status,
      createdAt: input.created_at.toISOString(),
      shippedAt: input.shipped_at ? input.shipped_at.toISOString() : null,
      deliveredAt: input.delivered_at ? input.delivered_at.toISOString() : null,
      estimatedDelivery: input.estimated_delivery
        ? input.estimated_delivery.toISOString()
        : null,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    };
  }
}
