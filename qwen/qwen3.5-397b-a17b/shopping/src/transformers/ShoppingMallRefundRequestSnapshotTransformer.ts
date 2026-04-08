import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallRefundRequestSnapshotTransformer {
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
        },
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequestId: input.refundRequest.id,
      status: input.status,
      reason: input.reason,
      sellerResponseType: input.seller_response_type,
      sellerResponseComment: input.seller_response_comment,
      createdAt: input.created_at.toISOString(),
    } satisfies IShoppingMallRefundRequestSnapshot;
  }
}
