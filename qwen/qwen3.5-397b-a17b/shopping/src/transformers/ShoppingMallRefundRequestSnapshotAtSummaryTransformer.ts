import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallRefundRequestSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        seller_response_type: true,
        seller_response_comment: true,
        created_at: true,
        refundRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      seller_response_type: input.seller_response_type,
      seller_response_comment: input.seller_response_comment,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallRefundRequestSnapshot.ISummary;
  }
}
