import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconPoliticalForumModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumReport> {
  const { moderator, reportId } = props;

  // Authorization: ensure the caller is an active moderator
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
        registereduser: { deleted_at: null, is_banned: false },
      },
    });

  if (!moderatorRecord) {
    throw new HttpException("Unauthorized: moderator not active", 403);
  }

  const report = await MyGlobal.prisma.econ_political_forum_reports.findUnique({
    where: { id: reportId },
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          email: true,
          deleted_at: true,
        },
      },
      reportedPost: { select: { id: true, thread_id: true, deleted_at: true } },
      reportedThread: {
        select: { id: true, category_id: true, deleted_at: true },
      },
      moderator: { select: { id: true, registereduser_id: true } },
      moderationCase: { select: { id: true, case_number: true } },
    },
  });

  if (!report) {
    throw new HttpException("Not Found", 404);
  }

  try {
    return {
      id: report.id as string & tags.Format<"uuid">,
      reporter_id:
        report.reporter_id === null
          ? null
          : (report.reporter_id as string & tags.Format<"uuid">),
      reported_post_id:
        report.reported_post_id === null
          ? null
          : (report.reported_post_id as string & tags.Format<"uuid">),
      reported_thread_id:
        report.reported_thread_id === null
          ? null
          : (report.reported_thread_id as string & tags.Format<"uuid">),
      moderator_id:
        report.moderator_id === null
          ? null
          : (report.moderator_id as string & tags.Format<"uuid">),
      moderation_case_id:
        report.moderation_case_id === null
          ? null
          : (report.moderation_case_id as string & tags.Format<"uuid">),
      reason_code: report.reason_code,
      reporter_text: report.reporter_text ?? null,
      reporter_anonymous: report.reporter_anonymous,
      status: report.status,
      priority: report.priority,
      created_at: toISOStringSafe(report.created_at),
      triaged_at: report.triaged_at ? toISOStringSafe(report.triaged_at) : null,
      reviewed_at: report.reviewed_at
        ? toISOStringSafe(report.reviewed_at)
        : null,
      resolved_at: report.resolved_at
        ? toISOStringSafe(report.resolved_at)
        : null,
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    };
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
