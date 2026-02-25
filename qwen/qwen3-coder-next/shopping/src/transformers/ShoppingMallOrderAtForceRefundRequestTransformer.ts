import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAtForceRefundRequestTransformer {
  export type Payload = Prisma.shopping_mall_order_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reason: true,
        status: true,
        rejection_reason: true,
        orderItem: true,
        customer: true,
        seller: true,
        customerSession: true,
        statusLogs: true,
        refundPayments: true,
      },
    } satisfies Prisma.shopping_mall_order_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.IForceRefundRequest> {
    return {
      reason: input.reason,
    };
  }
}
