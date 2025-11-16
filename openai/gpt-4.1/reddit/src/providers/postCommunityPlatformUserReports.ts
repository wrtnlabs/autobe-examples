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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserReports(props: {
  user: UserPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const {
    reported_post_id,
    reported_comment_id,
    reported_community_id,
    report_type,
    reason,
  } = props.body;
  const numTargets = [
    reported_post_id,
    reported_comment_id,
    reported_community_id,
  ].filter((v) => v !== undefined && v !== null).length;
  if (numTargets !== 1) {
    throw new HttpException(
      "Exactly one of reported_post_id, reported_comment_id, or reported_community_id must be provided.",
      400,
    );
  }

  let reported_post_summary:
    | ICommunityPlatformPost.ISummary
    | null
    | undefined = undefined;
  if (reported_post_id !== undefined && reported_post_id !== null) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: { id: reported_post_id, deleted_at: null },
      select: {
        id: true,
        community_id: true,
        user_id: true,
      },
    });
    if (!post) {
      throw new HttpException("Reported post not found.", 404);
    }
    reported_post_summary = {
      id: post.id,
      community_id: post.community_id,
      user_id: post.user_id,
      // no .community or .user context at this level
    };
  }

  let reported_comment_summary:
    | ICommunityPlatformComment.ISummary
    | null
    | undefined = undefined;
  if (reported_comment_id !== undefined && reported_comment_id !== null) {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: { id: reported_comment_id, deleted_at: null },
        select: {
          id: true,
          user_id: true,
          post_id: true,
          parent_id: true,
          created_at: true,
        },
      },
    );
    if (!comment) {
      throw new HttpException("Reported comment not found.", 404);
    }
    // For compliance with ISummary, we must supply post: ISummary
    const commentPost =
      await MyGlobal.prisma.community_platform_posts.findFirst({
        where: { id: comment.post_id },
        select: {
          id: true,
          community_id: true,
          user_id: true,
        },
      });
    if (!commentPost) {
      throw new HttpException("Comment's parent post not found.", 404);
    }
    reported_comment_summary = {
      id: comment.id,
      user: { id: comment.user_id },
      post: {
        id: commentPost.id,
        community_id: commentPost.community_id,
        user_id: commentPost.user_id,
      },
      parent_id: comment.parent_id ?? undefined,
      created_at: toISOStringSafe(comment.created_at),
    };
  }

  let reported_community_summary:
    | ICommunityPlatformCommunity.ISummary
    | null
    | undefined = undefined;
  if (reported_community_id !== undefined && reported_community_id !== null) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: { id: reported_community_id, deleted_at: null },
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
    if (!community) {
      throw new HttpException("Reported community not found.", 404);
    }
    reported_community_summary = {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url: community.image_url ?? undefined,
      status: community.status,
    };
  }

  const created = await MyGlobal.prisma.community_platform_reports.create({
    data: {
      id: id,
      reporter_user_id: props.user.id,
      reported_post_id: reported_post_id ?? null,
      reported_comment_id: reported_comment_id ?? null,
      reported_community_id: reported_community_id ?? null,
      report_type,
      reason,
      status: "open",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const reporter: ICommunityPlatformUser.ISummary = { id: props.user.id };

  return {
    id: created.id,
    reporter,
    reported_post: reported_post_summary ?? undefined,
    reported_comment: reported_comment_summary ?? undefined,
    reported_community: reported_community_summary ?? undefined,
    report_type: created.report_type,
    reason: created.reason,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? created.deleted_at
        : toISOStringSafe(created.deleted_at),
  };
}
