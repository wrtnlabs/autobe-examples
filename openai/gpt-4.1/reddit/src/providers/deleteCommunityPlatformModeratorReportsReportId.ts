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

export async function deleteCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  // 1. Lookup report and validate existence & not already deleted in a flat query
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.deleted_at !== null) {
    throw new HttpException("Report already deleted", 400);
  }

  // 2. Perform the soft-delete
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: { deleted_at: now },
  });

  // 3a. Reporter summary
  const reporter = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: report.reporter_user_id },
    select: { id: true },
  });
  // 3b. Reported post
  let reported_post: ICommunityPlatformPost.ISummary | null | undefined = null;
  if (report.reported_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: report.reported_post_id },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        community: {
          select: {
            id: true,
            name: true,
            display_title: true,
            description: true,
            visibility: true,
            image_url: true,
            status: true,
          },
        },
        user: {
          select: { id: true },
        },
      },
    });
    if (post && post.user) {
      reported_post = {
        id: post.id,
        community_id: post.community_id,
        community: post.community
          ? {
              id: post.community.id,
              name: post.community.name,
              display_title: post.community.display_title,
              description: post.community.description,
              visibility: post.community.visibility,
              image_url: post.community.image_url ?? undefined,
              status: post.community.status,
            }
          : undefined,
        user_id: post.user_id,
        user: { id: post.user.id },
      };
    } else {
      reported_post = null;
    }
  }
  // 3c. Reported comment
  let reported_comment: ICommunityPlatformComment.ISummary | null | undefined =
    null;
  if (report.reported_comment_id) {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: report.reported_comment_id },
        select: {
          id: true,
          user: { select: { id: true } },
          post: {
            select: {
              id: true,
              community_id: true,
              community: {
                select: {
                  id: true,
                  name: true,
                  display_title: true,
                  description: true,
                  visibility: true,
                  image_url: true,
                  status: true,
                },
              },
              user_id: true,
              user: { select: { id: true } },
            },
          },
          parent_id: true,
          created_at: true,
        },
      });
    if (comment && comment.user && comment.post && comment.post.user) {
      reported_comment = {
        id: comment.id,
        user: { id: comment.user.id },
        post: {
          id: comment.post.id,
          community_id: comment.post.community_id,
          community: comment.post.community
            ? {
                id: comment.post.community.id,
                name: comment.post.community.name,
                display_title: comment.post.community.display_title,
                description: comment.post.community.description,
                visibility: comment.post.community.visibility,
                image_url: comment.post.community.image_url ?? undefined,
                status: comment.post.community.status,
              }
            : undefined,
          user_id: comment.post.user_id,
          user: { id: comment.post.user.id },
        },
        parent_id: comment.parent_id ?? undefined,
        created_at: toISOStringSafe(comment.created_at),
      };
    } else {
      reported_comment = null;
    }
  }
  // 3d. Reported community
  let reported_community:
    | ICommunityPlatformCommunity.ISummary
    | null
    | undefined = null;
  if (report.reported_community_id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: report.reported_community_id },
        select: {
          id: true,
          name: true,
          display_title: true,
          description: true,
          visibility: true,
          image_url: true,
          status: true,
        },
      });
    if (community) {
      reported_community = {
        id: community.id,
        name: community.name,
        display_title: community.display_title,
        description: community.description,
        visibility: community.visibility,
        image_url: community.image_url ?? undefined,
        status: community.status,
      };
    }
  }
  // 4. Compose and return the DTO
  return {
    id: updated.id,
    reporter: reporter ? { id: reporter.id } : { id: report.reporter_user_id },
    reported_post: reported_post ?? null,
    reported_comment: reported_comment ?? null,
    reported_community: reported_community ?? null,
    report_type: report.report_type,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
