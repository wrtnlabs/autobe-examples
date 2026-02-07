import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceShipmentTransformer {
  export type Payload = Prisma.ecommerce_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier: true,
        tracking_number: true,
        shipping_date: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: true,
      },
    } satisfies Prisma.ecommerce_shipmentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceShipment> {
    return {
      id: input.id,
      carrier: input.carrier,
      tracking_number: input.tracking_number,
      shipping_date: input.shipping_date.toISOString(),
      estimated_delivery_date:
        input.estimated_delivery_date?.toISOString() ?? null,
      actual_delivery_date: input.actual_delivery_date?.toISOString() ?? null,
      status: typia.assert<
        "shipped" | "delivered" | "in transit" | "out for delivery"
      >(input.status),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
