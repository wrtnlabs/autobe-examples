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

export async function putCommunityPlatformAdministratorReportsReportId(props: {
  administrator: AdministratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  const now = toISOStringSafe(new Date());
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: { id: props.reportId, deleted_at: null },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  const updateInput = {
    ...(typeof props.body.report_type === "string"
      ? { report_type: props.body.report_type }
      : {}),
    ...(typeof props.body.reason === "string"
      ? { reason: props.body.reason }
      : {}),
    ...(typeof props.body.status === "string"
      ? { status: props.body.status }
      : {}),
    updated_at: now,
  };
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: updateInput,
  });
  const updated = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: { id: props.reportId },
  });
  if (!updated) {
    throw new HttpException("Report no longer exists after update", 404);
  }
  // Reporter summary (always present)
  const reporter = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: updated.reporter_user_id },
    select: { id: true },
  });
  // Post summary (only if exists)
  let reported_post: ICommunityPlatformPost.ISummary | null | undefined =
    undefined;
  if (updated.reported_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: updated.reported_post_id },
      select: { id: true, community_id: true, user_id: true },
    });
    if (post) {
      reported_post = {
        id: post.id,
        community_id: post.community_id,
        user_id: post.user_id,
        user: { id: post.user_id },
      };
    }
  }
  // Comment summary (requires dependent user AND post)
  let reported_comment: ICommunityPlatformComment.ISummary | null | undefined =
    undefined;
  if (updated.reported_comment_id) {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: updated.reported_comment_id },
        select: {
          id: true,
          user_id: true,
          post_id: true,
          parent_id: true,
          created_at: true,
        },
      });
    if (comment) {
      const commentUser =
        await MyGlobal.prisma.community_platform_users.findUnique({
          where: { id: comment.user_id },
          select: { id: true },
        });
      const commentPost =
        await MyGlobal.prisma.community_platform_posts.findUnique({
          where: { id: comment.post_id },
          select: { id: true, community_id: true, user_id: true },
        });
      if (commentUser && commentPost) {
        reported_comment = {
          id: comment.id,
          user: { id: commentUser.id },
          post: {
            id: commentPost.id,
            community_id: commentPost.community_id,
            user_id: commentPost.user_id,
            user: { id: commentPost.user_id },
          },
          parent_id: comment.parent_id === null ? undefined : comment.parent_id,
          created_at: toISOStringSafe(comment.created_at),
        };
      }
    }
  }
  // Community summary
  let reported_community:
    | ICommunityPlatformCommunity.ISummary
    | null
    | undefined = undefined;
  if (updated.reported_community_id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: updated.reported_community_id },
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
        image_url:
          typeof community.image_url === "string"
            ? community.image_url
            : undefined,
        status: community.status,
      };
    }
  }
  return {
    id: updated.id,
    reporter: reporter ? { id: reporter.id } : { id: updated.reporter_user_id },
    reported_post: reported_post ?? undefined,
    reported_comment: reported_comment ?? undefined,
    reported_community: reported_community ?? undefined,
    report_type: updated.report_type,
    reason: updated.reason,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at === null
        ? null
        : toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
