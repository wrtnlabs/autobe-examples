import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderReturnAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_returnsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        order: true,
        shopping_mall_order_refunds: {
          select: {
            amount: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_returnsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderReturn.ISummary> {
    return {
      id: input.id,
      status: input.status as
        | "pending"
        | "approved"
        | "rejected"
        | "processing"
        | "completed"
        | "cancelled",
      return_reason: input.reason,
      return_amount: input.shopping_mall_order_refunds?.amount || 0,
    };
  }
}
