import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformReportSnapshotTransformer {
  export type Payload = Prisma.community_platform_report_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_report_id: true,
        reviewed_by_admin_id: true,
        reviewed_by_member_id: true,
        community_platform_report_target_id: true,
        community_platform_report_resolution_id: true,
        snapshot_reason: true,
        snapshot_status: true,
        snapshot_decisioned_at: true,
        captured_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Relations: only minimal ids selected; DTO does not require nested data.
        report: {
          select: { id: true },
        } satisfies Prisma.community_platform_reportsFindManyArgs,
        reviewedByAdmin: {
          select: { id: true },
        } satisfies Prisma.community_platform_adminsFindManyArgs,
        reviewedByMember: {
          select: { id: true },
        } satisfies Prisma.community_platform_user_profilesFindManyArgs,
        reportTarget: {
          select: { id: true },
        } satisfies Prisma.community_platform_report_targetsFindManyArgs,
        resolution: {
          select: { id: true },
        } satisfies Prisma.community_platform_report_resolutionsFindManyArgs,
      },
    } satisfies Prisma.community_platform_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportSnapshot> {
    return {
      id: input.id,
      community_platform_report_id: input.community_platform_report_id,
      reviewed_by_admin_id: input.reviewed_by_admin_id ?? null,
      reviewed_by_member_id: input.reviewed_by_member_id ?? null,
      community_platform_report_target_id:
        input.community_platform_report_target_id,
      community_platform_report_resolution_id:
        input.community_platform_report_resolution_id ?? null,
      snapshot_reason: input.snapshot_reason,
      snapshot_status: input.snapshot_status,
      snapshot_decisioned_at:
        input.snapshot_decisioned_at?.toISOString() ?? null,
      captured_at: input.captured_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
