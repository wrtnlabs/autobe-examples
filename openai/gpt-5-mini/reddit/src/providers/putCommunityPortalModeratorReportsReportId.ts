import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPortalModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPortalReport.IUpdate;
}): Promise<ICommunityPortalReport> {
  const { moderator, reportId, body } = props;

  // Fetch the report (throws if not found)
  const report = await MyGlobal.prisma.community_portal_reports.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new HttpException("Not Found", 404);

  // Ensure caller is an active moderator record
  const moderatorRecord =
    await MyGlobal.prisma.community_portal_moderators.findFirst({
      where: { user_id: moderator.id, is_active: true },
    });
  if (!moderatorRecord) throw new HttpException("Unauthorized", 403);

  // Authorization: moderator must be global (community_id === null) or scoped to the report's community
  const reportCommunityId = report.community_id;
  if (
    moderatorRecord.community_id !== null &&
    moderatorRecord.community_id !== undefined
  ) {
    // Scoped moderator: require community match
    if (
      reportCommunityId === null ||
      reportCommunityId === undefined ||
      moderatorRecord.community_id !== reportCommunityId
    ) {
      throw new HttpException(
        "Unauthorized: moderator not assigned to this community",
        403,
      );
    }
  }

  // Business validations
  const allowedStatuses = [
    "OPEN",
    "IN_REVIEW",
    "REQUIRES_ACTION",
    "DISMISSED",
    "CLOSED",
  ] as const;
  if (
    body.status !== undefined &&
    body.status !== null &&
    !allowedStatuses.includes(body.status)
  ) {
    throw new HttpException("Bad Request: invalid status value", 400);
  }

  // Validate status transitions
  if (body.status !== undefined && body.status !== null) {
    const from = report.status;
    const to = body.status;
    const allowed: Record<string, string[]> = {
      OPEN: ["IN_REVIEW", "DISMISSED"],
      IN_REVIEW: ["REQUIRES_ACTION", "CLOSED", "DISMISSED"],
      REQUIRES_ACTION: ["CLOSED", "IN_REVIEW", "DISMISSED"],
      DISMISSED: [],
      CLOSED: [],
    };
    const allowedTargets = allowed[from] ?? [];
    if (from !== to && !allowedTargets.includes(to)) {
      throw new HttpException("Bad Request: invalid status transition", 400);
    }
  }

  // Validate provided moderator IDs reference active moderator assignments
  if (
    body.assigned_moderator_id !== undefined &&
    body.assigned_moderator_id !== null
  ) {
    const assigned =
      await MyGlobal.prisma.community_portal_moderators.findUnique({
        where: { id: body.assigned_moderator_id },
      });
    if (!assigned || !assigned.is_active)
      throw new HttpException(
        "Bad Request: assigned_moderator_id invalid or inactive",
        400,
      );
  }
  if (
    body.closed_by_moderator_id !== undefined &&
    body.closed_by_moderator_id !== null
  ) {
    const closer = await MyGlobal.prisma.community_portal_moderators.findUnique(
      {
        where: { id: body.closed_by_moderator_id },
      },
    );
    if (!closer || !closer.is_active)
      throw new HttpException(
        "Bad Request: closed_by_moderator_id invalid or inactive",
        400,
      );
  }

  // Timestamp validation (basic ISO 8601 UTC check)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  if (
    body.reviewed_at !== undefined &&
    body.reviewed_at !== null &&
    !isoRegex.test(body.reviewed_at)
  ) {
    throw new HttpException(
      "Bad Request: reviewed_at must be ISO 8601 UTC",
      400,
    );
  }
  if (
    body.closed_at !== undefined &&
    body.closed_at !== null &&
    !isoRegex.test(body.closed_at)
  ) {
    throw new HttpException("Bad Request: closed_at must be ISO 8601 UTC", 400);
  }

  // Perform update. Use inline data object to preserve clear Prisma errors.
  const updated = await MyGlobal.prisma.community_portal_reports.update({
    where: { id: reportId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.assigned_moderator_id !== undefined && {
        assigned_moderator_id: body.assigned_moderator_id,
      }),
      ...(body.closed_by_moderator_id !== undefined && {
        closed_by_moderator_id: body.closed_by_moderator_id,
      }),
      ...(body.resolution_notes !== undefined && {
        resolution_notes: body.resolution_notes,
      }),
      ...(body.reviewed_at !== undefined && {
        reviewed_at: body.reviewed_at
          ? toISOStringSafe(body.reviewed_at)
          : null,
      }),
      ...(body.closed_at !== undefined && {
        closed_at: body.closed_at ? toISOStringSafe(body.closed_at) : null,
      }),
      ...(body.is_urgent !== undefined && { is_urgent: body.is_urgent }),
      ...(body.severity !== undefined && { severity: body.severity }),
      ...(body.reporter_contact_email !== undefined && {
        reporter_contact_email: body.reporter_contact_email,
      }),
    },
  });

  // Audit logging: schema does not contain a dedicated audit table. A real implementation
  // should insert an audit record here recording moderator.id, reportId, and what changed.

  // Map Prisma fields (snake_case) to API DTO (camelCase) and convert dates
  return {
    id: updated.id,
    reporterUserId:
      updated.reporter_user_id === null ? null : updated.reporter_user_id,
    communityId: updated.community_id === null ? null : updated.community_id,
    postId: updated.post_id === null ? null : updated.post_id,
    commentId: updated.comment_id === null ? null : updated.comment_id,
    assignedModeratorId:
      updated.assigned_moderator_id === null
        ? null
        : updated.assigned_moderator_id,
    closedByModeratorId:
      updated.closed_by_moderator_id === null
        ? null
        : updated.closed_by_moderator_id,
    reasonCode: updated.reason_code,
    reasonText: updated.reason_text === null ? null : updated.reason_text,
    status: updated.status,
    isUrgent: updated.is_urgent,
    severity: updated.severity === null ? null : updated.severity,
    reporterContactEmail:
      updated.reporter_contact_email === null
        ? null
        : updated.reporter_contact_email,
    createdAt: toISOStringSafe(updated.created_at),
    reviewedAt: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : null,
    closedAt: updated.closed_at ? toISOStringSafe(updated.closed_at) : null,
    resolutionNotes:
      updated.resolution_notes === null ? null : updated.resolution_notes,
  } as ICommunityPortalReport;
}
