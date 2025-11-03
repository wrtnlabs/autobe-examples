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

export async function putCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReports.IUpdate;
}): Promise<ICommunityPlatformReports> {
  const { admin, reportId, body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Find the report, including for building relations & summary
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: reportId, deleted_at: null },
  });
  if (!report) throw new HttpException("Report not found", 404);

  // 2. Compose update shape: only apply fields present in body
  const updateData: Record<string, unknown> = {};
  if (body.report_type !== undefined) updateData.report_type = body.report_type;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.auto_hidden !== undefined) updateData.auto_hidden = body.auto_hidden;
  updateData.updated_at = now;

  const updated = await MyGlobal.prisma.community_platform_reports.update({
    where: { id: reportId },
    data: updateData,
  });

  // 3. Find reporter user/admin summary
  let reporter_user: ICommunityPlatformUser.ISummary | null | undefined =
    undefined;
  if (updated.reporter_user_id) {
    const user = await MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: updated.reporter_user_id },
      select: { id: true, display_name: true },
    });
    if (user) reporter_user = { id: user.id, display_name: user.display_name };
  }
  let reporter_admin: ICommunityPlatformAdmin.ISummary | null | undefined =
    undefined;
  if (updated.reporter_admin_id) {
    const adminEntity =
      await MyGlobal.prisma.community_platform_admins.findUnique({
        where: { id: updated.reporter_admin_id },
        select: { id: true, display_name: true },
      });
    if (adminEntity)
      reporter_admin = {
        id: adminEntity.id,
        display_name: adminEntity.display_name,
      };
  }

  // 4. Find post_report and comment_report
  const postReportRow =
    await MyGlobal.prisma.community_platform_report_of_posts.findUnique({
      where: { report_id: updated.id },
    });
  const post_report = postReportRow
    ? {
        id: postReportRow.id,
        report_id: postReportRow.report_id,
        target_post_id: postReportRow.target_post_id,
        created_at: toISOStringSafe(postReportRow.created_at),
      }
    : undefined;
  const commentReportRow =
    await MyGlobal.prisma.community_platform_report_of_comments.findUnique({
      where: { report_id: updated.id },
    });
  const comment_report = commentReportRow
    ? {
        id: commentReportRow.id,
        report_id: commentReportRow.report_id,
        target_comment_id: commentReportRow.target_comment_id,
        created_at: toISOStringSafe(commentReportRow.created_at),
      }
    : undefined;

  // 5. Find actions descendants (chronological order)
  const actionsRows =
    await MyGlobal.prisma.community_platform_report_actions.findMany({
      where: { report_id: updated.id },
      orderBy: { created_at: "asc" },
    });
  const actions = actionsRows
    .filter((action) => action.actor_admin_id !== null)
    .map((action) => ({
      id: action.id,
      report_id: action.report_id,
      actor_admin_id: action.actor_admin_id as string,
      action_type: typia.assert<
        | "comment"
        | "status_update"
        | "auto_hide"
        | "assign"
        | "resolve"
        | "dismiss"
      >(action.action_type),
      old_status: action.old_status ?? undefined,
      new_status: action.new_status ?? undefined,
      comment: action.comment ?? undefined,
      created_at: toISOStringSafe(action.created_at),
    }));

  return {
    id: updated.id,
    reporter_user: reporter_user ?? null,
    reporter_admin: reporter_admin ?? null,
    report_type: updated.report_type,
    status: updated.status,
    description: updated.description ?? null,
    auto_hidden: updated.auto_hidden,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    post_report,
    comment_report,
    actions,
  };
}
