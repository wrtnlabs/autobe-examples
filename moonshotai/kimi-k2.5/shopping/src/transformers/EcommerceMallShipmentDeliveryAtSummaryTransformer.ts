import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentDeliveryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipment_deliveriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shipment_id: true,
        customer_id: true,
        delivered_at: true,
        is_auto_delivered: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentDelivery.ISummary> {
    return {
      id: input.id,
      shipmentId: input.shipment_id,
      customerId: input.customer_id ?? null,
      deliveredAt: input.delivered_at.toISOString(),
      isAutoDelivered: input.is_auto_delivered,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
