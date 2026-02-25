import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        tracking_carrier: true,
        status: true,
        shipped_at: true,
        customer_confirmed_at: true,
        auto_confirmed_at: true,
        cancelled_at: true,
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment.ISummary> {
    return {
      id: input.id,
      tracking_number: input.tracking_number,
      tracking_carrier: input.tracking_carrier,
      status: input.status,
      shipped_at: input.shipped_at.toISOString(),
      customer_confirmed_at: input.customer_confirmed_at?.toISOString() ?? null,
      auto_confirmed_at: input.auto_confirmed_at?.toISOString() ?? null,
      cancelled_at: input.cancelled_at?.toISOString() ?? null,
    };
  }
}
