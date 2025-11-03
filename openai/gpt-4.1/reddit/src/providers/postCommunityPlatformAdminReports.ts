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

export async function postCommunityPlatformAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReports.ICreate;
}): Promise<ICommunityPlatformReports> {
  const { admin, body } = props;
  // Only one of target_post_id or target_comment_id may be set
  const isPostReport =
    body.target_post_id !== null && body.target_post_id !== undefined;
  const isCommentReport =
    body.target_comment_id !== null && body.target_comment_id !== undefined;

  if ((isPostReport ? 1 : 0) + (isCommentReport ? 1 : 0) !== 1) {
    throw new HttpException(
      "Exactly one of target_post_id or target_comment_id must be provided.",
      400,
    );
  }

  // Prevent duplicate active report by same admin on same content
  const duplicateReport =
    await MyGlobal.prisma.community_platform_reports.findFirst({
      where: {
        reporter_admin_id: admin.id,
        status: { in: ["open", "under_review", "auto_hidden"] },
        ...(isPostReport
          ? {
              community_platform_report_of_posts_some: {
                target_post_id: body.target_post_id as string,
              },
            }
          : {}),
        ...(isCommentReport
          ? {
              community_platform_report_of_comments_some: {
                target_comment_id: body.target_comment_id as string,
              },
            }
          : {}),
      },
      include: {
        community_platform_report_of_posts: true,
        community_platform_report_of_comments: true,
      },
    });
  if (duplicateReport) {
    throw new HttpException(
      "Duplicate active report exists by this admin on the target content.",
      409,
    );
  }

  const reportId = v4();
  const now = toISOStringSafe(new Date());

  const createdReport = await MyGlobal.prisma.community_platform_reports.create(
    {
      data: {
        id: reportId,
        reporter_admin_id: admin.id,
        reporter_user_id: null,
        report_type: body.report_type,
        status: "open",
        description: body.description ?? null,
        auto_hidden: false, // auto-hide trigger not implemented; always false
        created_at: now,
        updated_at: now,
      },
    },
  );

  let postReport = null;
  let commentReport = null;
  if (isPostReport) {
    postReport =
      await MyGlobal.prisma.community_platform_report_of_posts.create({
        data: {
          id: v4(),
          report_id: createdReport.id,
          target_post_id: body.target_post_id as string,
          created_at: now,
        },
      });
  }
  if (isCommentReport) {
    commentReport =
      await MyGlobal.prisma.community_platform_report_of_comments.create({
        data: {
          id: v4(),
          report_id: createdReport.id,
          target_comment_id: body.target_comment_id as string,
          created_at: now,
        },
      });
  }

  // Fetch admin summary for response
  const adminEntity =
    await MyGlobal.prisma.community_platform_admins.findUnique({
      where: { id: admin.id },
      select: { id: true, display_name: true },
    });
  const adminSummary = adminEntity
    ? { id: adminEntity.id, display_name: adminEntity.display_name }
    : undefined;

  return {
    id: createdReport.id,
    reporter_user: null,
    reporter_admin: adminSummary,
    report_type: createdReport.report_type,
    status: createdReport.status,
    description: createdReport.description ?? undefined,
    auto_hidden: createdReport.auto_hidden,
    created_at: toISOStringSafe(createdReport.created_at),
    updated_at: toISOStringSafe(createdReport.updated_at),
    deleted_at:
      createdReport.deleted_at !== null &&
      createdReport.deleted_at !== undefined
        ? toISOStringSafe(createdReport.deleted_at)
        : undefined,
    post_report: postReport
      ? {
          id: postReport.id,
          report_id: postReport.report_id,
          target_post_id: postReport.target_post_id,
          created_at: toISOStringSafe(postReport.created_at),
        }
      : null,
    comment_report: commentReport
      ? {
          id: commentReport.id,
          report_id: commentReport.report_id,
          target_comment_id: commentReport.target_comment_id,
          created_at: toISOStringSafe(commentReport.created_at),
        }
      : null,
    actions: [], // No action logs for report creation
  };
}
