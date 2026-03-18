import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    const report = await tx.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        community_id: true,
        reporter_id: true,
        reason: true,
        target_type: true,
        target_id: true,
        deleted_at: true,
      },
    });
    if (report.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const moderator =
      await tx.community_platform_community_moderators.findFirst({
        where: {
          community_id: report.community_id,
          moderator_user_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
    const existingResolution =
      await tx.community_platform_report_resolutions.findFirst({
        where: {
          community_platform_report_id: report.id,
          deleted_at: null,
        },
        select: { id: true, resolution_decision: true },
      });
    if (
      existingResolution !== null &&
      existingResolution.resolution_decision === "approved"
    ) {
      throw new HttpException("Inconsistent moderation state", 409);
    }
    if (
      existingResolution !== null &&
      existingResolution.resolution_decision === "dismissed"
    ) {
      return;
    }
    const resolutionId = v4() satisfies string & tags.Format<"uuid">;
    await tx.community_platform_report_resolutions.create({
      data: {
        id: resolutionId,
        community_platform_report_id: report.id,
        moderated_by_user_id: props.member.id,
        resolution_decision: "dismissed",
        moderation_note: "",
        resolved_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
    const target = await tx.community_platform_report_targets.findFirstOrThrow({
      where: {
        community_platform_report_id: report.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    await tx.community_platform_report_snapshots.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid">,
        community_platform_report_id: report.id,
        reviewed_by_admin_id: null,
        reviewed_by_member_id: props.member.id,
        community_platform_report_target_id: target.id,
        community_platform_report_resolution_id: resolutionId,
        snapshot_reason: report.reason,
        snapshot_status: "dismissed",
        snapshot_decisioned_at: nowIso,
        captured_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
    await tx.community_platform_reports.update({
      where: { id: report.id },
      data: {
        deleted_at: nowIso,
      },
    });
  });
}
