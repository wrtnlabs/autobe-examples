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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorReportsReportId(props: {
  administrator: AdministratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  // Find the report to ensure it exists and is not already deleted
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.deleted_at !== null) {
    throw new HttpException("Report is already deleted", 400);
  }

  // Soft delete by updating deleted_at to current ISO string
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: { deleted_at: now },
  });

  // Load reporter summary
  const reporterSummary = {
    id: updated.reporter_user_id,
  };

  // Possibly load referenced post, comment, or community summaries
  let reported_post: ICommunityPlatformPost.ISummary | null | undefined =
    undefined;
  let reported_comment: ICommunityPlatformComment.ISummary | null | undefined =
    undefined;
  let reported_community:
    | ICommunityPlatformCommunity.ISummary
    | null
    | undefined = undefined;

  if (updated.reported_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: updated.reported_post_id },
    });
    if (post) {
      let communitySummary: ICommunityPlatformCommunity.ISummary | undefined =
        undefined;
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
            image_url: comm.image_url ?? null,
            status: comm.status,
          };
        }
      }
      let userSummary: ICommunityPlatformUser.ISummary | undefined = undefined;
      if (post.user_id) {
        userSummary = { id: post.user_id };
      }
      reported_post = {
        id: post.id,
        community_id: post.community_id,
        community: communitySummary,
        user_id: post.user_id,
        user: userSummary,
      };
    } else {
      reported_post = null;
    }
  }
  if (updated.reported_comment_id) {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: updated.reported_comment_id },
      });
    if (comment) {
      // Fetch post for this comment for ISummary
      let postSummary: ICommunityPlatformPost.ISummary | undefined = undefined;
      if (comment.post_id) {
        const post = await MyGlobal.prisma.community_platform_posts.findUnique({
          where: { id: comment.post_id },
        });
        if (post) {
          let commSummary: ICommunityPlatformCommunity.ISummary | undefined =
            undefined;
          if (post.community_id) {
            const comm =
              await MyGlobal.prisma.community_platform_communities.findUnique({
                where: { id: post.community_id },
              });
            if (comm) {
              commSummary = {
                id: comm.id,
                name: comm.name,
                display_title: comm.display_title,
                description: comm.description,
                visibility: comm.visibility,
                image_url: comm.image_url ?? null,
                status: comm.status,
              };
            }
          }
          let userSummary: ICommunityPlatformUser.ISummary | undefined =
            undefined;
          if (post.user_id) {
            userSummary = { id: post.user_id };
          }
          postSummary = {
            id: post.id,
            community_id: post.community_id,
            community: commSummary,
            user_id: post.user_id,
            user: userSummary,
          };
        }
      }
      reported_comment = {
        id: comment.id,
        user: { id: comment.user_id },
        post: postSummary!,
        parent_id: comment.parent_id ?? undefined,
        created_at: toISOStringSafe(comment.created_at),
      };
    } else {
      reported_comment = null;
    }
  }
  if (updated.reported_community_id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: updated.reported_community_id },
      });
    if (community) {
      reported_community = {
        id: community.id,
        name: community.name,
        display_title: community.display_title,
        description: community.description,
        visibility: community.visibility,
        image_url: community.image_url ?? null,
        status: community.status,
      };
    } else {
      reported_community = null;
    }
  }

  return {
    id: updated.id,
    reporter: reporterSummary,
    reported_post: reported_post ?? undefined,
    reported_comment: reported_comment ?? undefined,
    reported_community: reported_community ?? undefined,
    report_type: updated.report_type,
    reason: updated.reason,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
