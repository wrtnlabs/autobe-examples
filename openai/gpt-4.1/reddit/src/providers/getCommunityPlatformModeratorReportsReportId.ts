import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    include: {
      reporterUser: true,
      reportedPost: true,
      reportedComment: true,
      reportedCommunity: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found.", 404);
  }
  const reporterSummary = { id: report.reporter_user_id };
  const reportedPostSummary = report.reportedPost
    ? {
        id: report.reportedPost.id,
        community_id: report.reportedPost.community_id,
        user_id: report.reportedPost.user_id,
      }
    : undefined;
  let reportedCommentSummary: ICommunityPlatformComment.ISummary | undefined;
  if (report.reportedComment) {
    let commentPost: null | {
      id: string;
      community_id: string;
      user_id: string;
    } = null;
    if (report.reportedComment.post_id) {
      commentPost = await MyGlobal.prisma.community_platform_posts.findUnique({
        where: { id: report.reportedComment.post_id },
        select: { id: true, community_id: true, user_id: true },
      });
    }
    // Only construct summary if post found
    reportedCommentSummary = {
      id: report.reportedComment.id,
      user: { id: report.reportedComment.user_id },
      post: commentPost
        ? {
            id: commentPost.id,
            community_id: commentPost.community_id,
            user_id: commentPost.user_id,
          }
        : { id: report.reportedComment.post_id, community_id: "", user_id: "" },
      parent_id:
        report.reportedComment.parent_id === null
          ? undefined
          : report.reportedComment.parent_id,
      created_at: toISOStringSafe(report.reportedComment.created_at),
    };
  }
  const reportedCommunitySummary = report.reportedCommunity
    ? {
        id: report.reportedCommunity.id,
        name: report.reportedCommunity.name,
        display_title: report.reportedCommunity.display_title,
        description: report.reportedCommunity.description,
        visibility: report.reportedCommunity.visibility,
        image_url:
          typeof report.reportedCommunity.image_url === "string"
            ? report.reportedCommunity.image_url
            : undefined,
        status: report.reportedCommunity.status,
      }
    : undefined;
  return {
    id: report.id,
    reporter: reporterSummary,
    reported_post: reportedPostSummary ?? null,
    reported_comment: reportedCommentSummary ?? null,
    reported_community: reportedCommunitySummary ?? null,
    report_type: report.report_type,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
