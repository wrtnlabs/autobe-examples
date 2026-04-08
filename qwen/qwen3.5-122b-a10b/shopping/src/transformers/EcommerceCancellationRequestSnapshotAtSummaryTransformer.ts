import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        status_before: true,
        status_after: true,
        changed_by_actor_id: true,
        changed_by_actor_type: true,
        change_reason: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_cancellation_requestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      status_before: input.status_before,
      status_after: input.status_after,
      changed_by_actor_id: input.changed_by_actor_id,
      changed_by_actor_type: input.changed_by_actor_type,
      change_reason: input.change_reason ?? null,
    } satisfies IEcommerceCancellationRequestSnapshot.ISummary;
  }
}
