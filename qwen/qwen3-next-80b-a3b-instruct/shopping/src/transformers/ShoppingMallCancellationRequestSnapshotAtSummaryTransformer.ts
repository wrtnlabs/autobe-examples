import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        responder_id: true,
        response_reason: true,
        changed_at: true,
        changed_by: true,
        cancellationRequest: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as any as "pending" | "approved" | "rejected",
      responder_id: input.responder_id,
      response_reason: input.response_reason,
      changed_at: toISOStringSafe(input.changed_at),
      changed_by: input.changed_by as any as "customer" | "seller" | "admin",
      cancellation_request_id: input.cancellationRequest.id,
    };
  }
}
