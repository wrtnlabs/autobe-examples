import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        status_before: true,
        status_after: true,
        action: true,
        created_at: true,
        updated_at: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      actorType: input.actor_type,
      statusBefore: input.status_before ?? null,
      statusAfter: input.status_after ?? null,
      action: input.action,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      cancellationRequestId: input.cancellationRequest.id,
    };
  }
}
