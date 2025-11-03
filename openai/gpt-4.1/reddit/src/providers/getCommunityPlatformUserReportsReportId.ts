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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserReportsReportId(props: {
  user: UserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReports> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    include: {
      reporterUser: true,
      reporterAdmin: true,
      community_platform_report_of_posts: true,
      community_platform_report_of_comments: true,
      community_platform_report_actions: { orderBy: { created_at: "asc" } },
    },
  });
  if (!report || report.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (report.reporter_user_id) {
    if (report.reporter_user_id !== props.user.id) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (report.reporter_admin_id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: report.id,
    reporter_user: report.reporterUser
      ? {
          id: report.reporterUser.id,
          display_name: report.reporterUser.display_name,
        }
      : undefined,
    reporter_admin: report.reporterAdmin
      ? {
          id: report.reporterAdmin.id,
          display_name: report.reporterAdmin.display_name,
        }
      : undefined,
    report_type: report.report_type,
    status: report.status,
    description:
      typeof report.description === "string" ? report.description : undefined,
    auto_hidden: report.auto_hidden,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
    post_report: report.community_platform_report_of_posts
      ? {
          id: report.community_platform_report_of_posts.id,
          report_id: report.community_platform_report_of_posts.report_id,
          target_post_id:
            report.community_platform_report_of_posts.target_post_id,
          created_at: toISOStringSafe(
            report.community_platform_report_of_posts.created_at,
          ),
        }
      : undefined,
    comment_report: report.community_platform_report_of_comments
      ? {
          id: report.community_platform_report_of_comments.id,
          report_id: report.community_platform_report_of_comments.report_id,
          target_comment_id:
            report.community_platform_report_of_comments.target_comment_id,
          created_at: toISOStringSafe(
            report.community_platform_report_of_comments.created_at,
          ),
        }
      : undefined,
    actions: Array.isArray(report.community_platform_report_actions)
      ? report.community_platform_report_actions.map((action) => {
          const result: any = {
            id: action.id,
            report_id: action.report_id,
            action_type: action.action_type,
            old_status:
              typeof action.old_status === "string"
                ? action.old_status
                : undefined,
            new_status:
              typeof action.new_status === "string"
                ? action.new_status
                : undefined,
            comment:
              typeof action.comment === "string" ? action.comment : undefined,
            created_at: toISOStringSafe(action.created_at),
          };
          if (action.actor_admin_id !== null) {
            result.actor_admin_id =
              action.actor_admin_id satisfies string as string;
          }
          return result;
        })
      : undefined,
  };
}
