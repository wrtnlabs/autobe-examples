import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function putCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report || report.deleted_at !== null) {
    throw new HttpException("Report not found.", 404);
  }
  const updateFields: Record<string, unknown> = {};
  if (props.body.status !== undefined) updateFields.status = props.body.status;
  if (props.body.report_type !== undefined)
    updateFields.report_type = props.body.report_type;
  if (props.body.reason !== undefined) updateFields.reason = props.body.reason;
  updateFields.updated_at = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: updateFields,
  });
  const full = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!full)
    throw new HttpException("Post-update fetch failed for report.", 500);
  // Lookup related summaries explicitly
  let reporterSummary: ICommunityPlatformUser.ISummary = {
    id: full.reporter_user_id,
  };
  let reportedPostSummary: ICommunityPlatformPost.ISummary | undefined;
  let reportedCommentSummary: ICommunityPlatformComment.ISummary | undefined;
  let reportedCommunitySummary:
    | ICommunityPlatformCommunity.ISummary
    | undefined;

  if (full.reported_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: full.reported_post_id },
    });
    if (post) {
      let communitySummary: ICommunityPlatformCommunity.ISummary | undefined;
      if (post.community_id) {
        const comm =
          await MyGlobal.prisma.community_platform_communities.findUnique({
            where: { id: post.community_id },
          });
        if (comm) {
          communitySummary = {
            id: comm.id,
            name: comm.name,
            display_title: comm.display_title,
            description: comm.description,
            visibility: comm.visibility,
            image_url: comm.image_url ?? undefined,
            status: comm.status,
          };
        }
      }
      let userSummary: ICommunityPlatformUser.ISummary | undefined;
      if (post.user_id) {
        userSummary = { id: post.user_id };
      }
      reportedPostSummary = {
        id: post.id,
        community_id: post.community_id,
        community: communitySummary,
        user_id: post.user_id,
        user: userSummary,
      };
    }
  }

  if (full.reported_comment_id) {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: full.reported_comment_id },
      });
    if (comment && comment.user_id && comment.post_id) {
      const userSummary: ICommunityPlatformUser.ISummary = {
        id: comment.user_id,
      };
      let postSummary: ICommunityPlatformPost.ISummary | undefined;
      const post = await MyGlobal.prisma.community_platform_posts.findUnique({
        where: { id: comment.post_id },
      });
      if (post) {
        let communitySummary: ICommunityPlatformCommunity.ISummary | undefined;
        if (post.community_id) {
          const comm =
            await MyGlobal.prisma.community_platform_communities.findUnique({
              where: { id: post.community_id },
            });
          if (comm) {
            communitySummary = {
              id: comm.id,
              name: comm.name,
              display_title: comm.display_title,
              description: comm.description,
              visibility: comm.visibility,
              image_url: comm.image_url ?? undefined,
              status: comm.status,
            };
          }
        }
        let postUserSummary: ICommunityPlatformUser.ISummary | undefined;
        if (post.user_id) {
          postUserSummary = { id: post.user_id };
        }
        postSummary = {
          id: post.id,
          community_id: post.community_id,
          community: communitySummary,
          user_id: post.user_id,
          user: postUserSummary,
        };
      }
      if (postSummary) {
        reportedCommentSummary = {
          id: comment.id,
          user: userSummary,
          post: postSummary,
          parent_id: comment.parent_id ?? undefined,
          created_at: toISOStringSafe(comment.created_at),
        };
      }
    }
  }

  if (full.reported_community_id) {
    const comm =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: full.reported_community_id },
      });
    if (comm) {
      reportedCommunitySummary = {
        id: comm.id,
        name: comm.name,
        display_title: comm.display_title,
        description: comm.description,
        visibility: comm.visibility,
        image_url: comm.image_url ?? undefined,
        status: comm.status,
      };
    }
  }

  return {
    id: full.id,
    reporter: reporterSummary,
    reported_post: reportedPostSummary,
    reported_comment: reportedCommentSummary,
    reported_community: reportedCommunitySummary,
    report_type: full.report_type,
    reason: full.reason,
    status: full.status,
    created_at: toISOStringSafe(full.created_at),
    updated_at: toISOStringSafe(full.updated_at),
    deleted_at: full.deleted_at ? toISOStringSafe(full.deleted_at) : undefined,
  };
}
