import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
        carrier: true,
        tracking_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        shipmentItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.ISummary> {
    return {
      id: input.id,
      carrier: input.carrier,
      tracking_number: input.tracking_number,
      created_at: input.created_at.toISOString(),
      item_count: input.shipmentItems.length,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
    };
  }
}
