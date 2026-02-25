import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefundRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequestLog";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallOrderRefundRequestLogAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_order_refund_request_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        new_status: true,
        old_status: true,
        reason: true,
        rejection_reason: true,
        changed_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_refund_request_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderRefundRequestLog.ISummary> {
    return {
      id: input.id,
      new_status: typia.assert<
        IShoppingMallOrderRefundRequestLog.ISummary["new_status"]
      >(input.new_status),
      old_status: typia.assert<
        IShoppingMallOrderRefundRequestLog.ISummary["old_status"]
      >(input.old_status),
      reason: input.reason,
      rejection_reason: input.rejection_reason,
      changed_at: toISOStringSafe(input.changed_at),
      seller: input.seller
        ? await ShoppingMallSellerAtSummaryTransformer.transform(input.seller)
        : null,
    };
  }
}
