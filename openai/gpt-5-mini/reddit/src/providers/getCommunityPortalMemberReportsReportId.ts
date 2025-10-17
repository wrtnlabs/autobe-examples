import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPortalMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPortalReport> {
  const { member, reportId } = props;

  // Retrieve report
  const report = await MyGlobal.prisma.community_portal_reports.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new HttpException("Not Found", 404);

  // Authorization checks
  const isReporter =
    report.reporter_user_id !== null && report.reporter_user_id === member.id;

  let isAssignedModerator = false;
  if (report.assigned_moderator_id !== null) {
    const assignedModerator =
      await MyGlobal.prisma.community_portal_moderators.findUnique({
        where: { id: report.assigned_moderator_id },
      });
    if (
      assignedModerator !== null &&
      assignedModerator.user_id === member.id &&
      assignedModerator.is_active
    ) {
      isAssignedModerator = true;
    }
  }

  let isCommunityModerator = false;
  if (!isAssignedModerator && report.community_id !== null) {
    const communityModerator =
      await MyGlobal.prisma.community_portal_moderators.findFirst({
        where: {
          community_id: report.community_id,
          user_id: member.id,
          is_active: true,
        },
      });
    if (communityModerator !== null) isCommunityModerator = true;
  }

  const isAuthorizedForView =
    isReporter || isAssignedModerator || isCommunityModerator;
  if (!isAuthorizedForView) throw new HttpException("Forbidden", 403);

  const isAuthorizedForSensitive = isReporter || isAssignedModerator;

  return {
    id: report.id,
    reporterUserId:
      report.reporter_user_id === null ? null : report.reporter_user_id,
    communityId: report.community_id === null ? null : report.community_id,
    postId: report.post_id === null ? null : report.post_id,
    commentId: report.comment_id === null ? null : report.comment_id,
    assignedModeratorId:
      report.assigned_moderator_id === null
        ? null
        : report.assigned_moderator_id,
    closedByModeratorId:
      report.closed_by_moderator_id === null
        ? null
        : report.closed_by_moderator_id,
    reasonCode: report.reason_code,
    reasonText: report.reason_text === null ? null : report.reason_text,
    status: report.status,
    isUrgent: report.is_urgent,
    severity: report.severity === null ? null : report.severity,
    reporterContactEmail: isAuthorizedForSensitive
      ? report.reporter_contact_email === null
        ? null
        : report.reporter_contact_email
      : undefined,
    createdAt: toISOStringSafe(report.created_at),
    reviewedAt: report.reviewed_at ? toISOStringSafe(report.reviewed_at) : null,
    closedAt: report.closed_at ? toISOStringSafe(report.closed_at) : null,
    resolutionNotes: isAuthorizedForSensitive
      ? report.resolution_notes === null
        ? null
        : report.resolution_notes
      : undefined,
  };
}
