import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformReportSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_report_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_reason: true,
        snapshot_status: true,
        snapshot_decisioned_at: true,
        captured_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community_platform_report_target_id: true,
        community_platform_report_resolution_id: true,
        reviewed_by_admin_id: true,
        reviewed_by_member_id: true,
        // Relation selections for completeness
        report: { select: { id: true } },
        reviewedByAdmin: { select: { id: true } },
        reviewedByMember: { select: { id: true } },
        reportTarget: { select: { id: true } },
        resolution: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportSnapshot.ISummary> {
    return {
      id: input.id,
      snapshotReason: input.snapshot_reason,
      snapshotStatus: input.snapshot_status,
      capturedAt: input.captured_at.toISOString(),
      snapshotDecisionedAt: input.snapshot_decisioned_at?.toISOString() ?? null,
      reviewedByAdminId:
        input.reviewed_by_admin_id ?? input.reviewedByAdmin?.id ?? null,
      reviewedByMemberId:
        input.reviewed_by_member_id ?? input.reviewedByMember?.id ?? null,
      reportTargetId:
        input.community_platform_report_target_id ?? input.reportTarget.id,
      resolutionId:
        input.community_platform_report_resolution_id ??
        input.resolution?.id ??
        null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
