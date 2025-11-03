import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReports> {
  const { reportId } = props;
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // reporter_user summary (null if not set)
  let reporter_user: ICommunityPlatformUser.ISummary | null | undefined;
  if (report.reporter_user_id) {
    const user = await MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: report.reporter_user_id },
      select: { id: true, display_name: true },
    });
    reporter_user = user
      ? { id: user.id, display_name: user.display_name }
      : null;
  } else {
    reporter_user = null;
  }

  // reporter_admin summary (null if not set)
  let reporter_admin: ICommunityPlatformAdmin.ISummary | null | undefined;
  if (report.reporter_admin_id) {
    const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
      where: { id: report.reporter_admin_id },
      select: { id: true, display_name: true },
    });
    reporter_admin = admin
      ? { id: admin.id, display_name: admin.display_name }
      : null;
  } else {
    reporter_admin = null;
  }

  // post_report (null if not present)
  const post_report_record =
    await MyGlobal.prisma.community_platform_report_of_posts.findUnique({
      where: { report_id: report.id },
    });
  const post_report = post_report_record
    ? {
        id: post_report_record.id,
        report_id: post_report_record.report_id,
        target_post_id: post_report_record.target_post_id,
        created_at: toISOStringSafe(post_report_record.created_at),
      }
    : null;

  // comment_report (null if not present)
  const comment_report_record =
    await MyGlobal.prisma.community_platform_report_of_comments.findUnique({
      where: { report_id: report.id },
    });
  const comment_report = comment_report_record
    ? {
        id: comment_report_record.id,
        report_id: comment_report_record.report_id,
        target_comment_id: comment_report_record.target_comment_id,
        created_at: toISOStringSafe(comment_report_record.created_at),
      }
    : null;

  // actions (may be empty array)
  const actions_records =
    await MyGlobal.prisma.community_platform_report_actions.findMany({
      where: { report_id: report.id },
      orderBy: { created_at: "asc" },
    });
  const actions = actions_records.map((action) => {
    const result: any = {
      id: action.id,
      report_id: action.report_id,
      action_type: action.action_type,
      old_status: action.old_status ?? undefined,
      new_status: action.new_status ?? undefined,
      comment: action.comment ?? undefined,
      created_at: toISOStringSafe(action.created_at),
    };
    if (action.actor_admin_id !== null && action.actor_admin_id !== undefined) {
      result.actor_admin_id = action.actor_admin_id satisfies string as string &
        tags.Format<"uuid">;
    }
    return result;
  });

  return {
    id: report.id,
    reporter_user: reporter_user,
    reporter_admin: reporter_admin,
    report_type: report.report_type,
    status: report.status,
    description: report.description ?? undefined,
    auto_hidden: report.auto_hidden,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
    post_report: post_report,
    comment_report: comment_report,
    actions,
  };
}
