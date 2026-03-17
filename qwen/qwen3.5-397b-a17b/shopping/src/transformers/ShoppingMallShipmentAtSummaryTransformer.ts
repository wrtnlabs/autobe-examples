import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";

export namespace ShoppingMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_carrier: true,
        tracking_number: true,
        shipped_at: true,
        delivered_at: true,
        delivery_confirmed_at: true,
        auto_delivered_at: true,
        created_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment.ISummary> {
    return {
      id: input.id,
      tracking_carrier: input.tracking_carrier,
      tracking_number: input.tracking_number,
      shipped_at: input.shipped_at?.toISOString() ?? null,
      delivered_at: input.delivered_at?.toISOString() ?? null,
      delivery_confirmed_at: input.delivery_confirmed_at?.toISOString() ?? null,
      auto_delivered_at: input.auto_delivered_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
    };
  }
}
