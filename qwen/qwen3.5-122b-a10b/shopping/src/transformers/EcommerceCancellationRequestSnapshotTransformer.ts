import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCancellationRequestSnapshotTransformer {
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
        },
      },
    } satisfies Prisma.ecommerce_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCancellationRequestSnapshot> {
    return {
      id: input.id,
      ecommerceCancellationRequestId: input.cancellationRequest.id,
      createdAt: input.created_at.toISOString(),
      statusBefore: input.status_before,
      statusAfter: input.status_after,
      changedByActorId: input.changed_by_actor_id,
      changedByActorType: input.changed_by_actor_type,
      changeReason: input.change_reason ?? null,
    } satisfies IEcommerceCancellationRequestSnapshot;
  }
}
