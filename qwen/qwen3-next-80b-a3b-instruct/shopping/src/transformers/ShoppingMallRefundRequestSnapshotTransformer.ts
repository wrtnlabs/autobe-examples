import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallRefundRequestSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        version: true,
        reason: true,
        status: true,
        responder_id: true,
        response_reason: true,
        changed_at: true,
        changed_by: true,
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
      version: input.version,
      reason: input.reason,
      status: input.status,
      responder_id: input.responder_id ?? undefined,
      response_reason: input.response_reason ?? undefined,
      changed_at: input.changed_at.toISOString(),
      changed_by: input.changed_by,
      refund_request_id: input.refundRequest.id,
    };
  }
}
