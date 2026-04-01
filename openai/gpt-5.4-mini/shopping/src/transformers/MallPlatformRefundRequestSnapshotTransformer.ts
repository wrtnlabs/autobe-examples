import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformRefundRequestSnapshotTransformer {
  export type Payload = Prisma.mall_platform_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        mall_platform_refund_request_id: true,
        snapshot_reason: true,
        status_before: true,
        status_after: true,
        reviewer_role: true,
        reviewer_note: true,
        created_at: true,
      },
    } satisfies Prisma.mall_platform_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformRefundRequestSnapshot> {
    return {
      id: input.id,
      mallPlatformRefundRequestId: input.mall_platform_refund_request_id,
      snapshotReason: input.snapshot_reason,
      statusBefore: input.status_before,
      statusAfter: input.status_after,
      reviewerRole: input.reviewer_role ?? null,
      reviewerNote: input.reviewer_note ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
