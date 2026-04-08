import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        status_before: true,
        status_after: true,
        reason_before: true,
        reason_after: true,
        reviewer_note: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      statusBefore: input.status_before,
      statusAfter: input.status_after,
      reasonBefore: input.reason_before ?? undefined,
      reasonAfter: input.reason_after ?? undefined,
      reviewerNote: input.reviewer_note ?? undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
}
