import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationAction.ICreate;
}): Promise<ICommunityPlatformModerationAction> {
  const now = toISOStringSafe(new Date());

  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: { id: props.body.report_id, deleted_at: null },
  });
  if (!report) {
    throw new HttpException("Referenced report not found.", 404);
  }

  let targetPost = null;
  if (props.body.target_post_id) {
    targetPost = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: { id: props.body.target_post_id, deleted_at: null },
    });
    if (!targetPost) {
      throw new HttpException("Referenced target post not found.", 404);
    }
  }

  let targetComment = null;
  if (props.body.target_comment_id) {
    targetComment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: { id: props.body.target_comment_id, deleted_at: null },
      },
    );
    if (!targetComment) {
      throw new HttpException("Referenced target comment not found.", 404);
    }
  }

  let targetCommunity = null;
  if (props.body.target_community_id) {
    targetCommunity =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: { id: props.body.target_community_id, deleted_at: null },
      });
    if (!targetCommunity) {
      throw new HttpException("Referenced target community not found.", 404);
    }
  }

  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        report_id: props.body.report_id,
        target_post_id: props.body.target_post_id ?? null,
        target_comment_id: props.body.target_comment_id ?? null,
        target_community_id: props.body.target_community_id ?? null,
        action_type: props.body.action_type,
        result: props.body.result,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  const targetPostSummary = targetPost
    ? {
        id: targetPost.id as string & tags.Format<"uuid">,
        community_id: targetPost.community_id as string & tags.Format<"uuid">,
        user_id: targetPost.user_id as string & tags.Format<"uuid">,
      }
    : null;

  const targetCommentSummary = targetComment
    ? {
        id: targetComment.id as string & tags.Format<"uuid">,
        user: {
          id: targetComment.user_id as string & tags.Format<"uuid">,
        },
        post: {
          id: targetComment.post_id as string & tags.Format<"uuid">,
          community_id: (targetPost
            ? targetPost.community_id
            : moderationAction.target_community_id) as string &
            tags.Format<"uuid">,
          user_id: (targetPost ? targetPost.user_id : undefined) as string &
            tags.Format<"uuid">,
        },
        parent_id:
          targetComment.parent_id === null ||
          targetComment.parent_id === undefined
            ? undefined
            : (targetComment.parent_id as string & tags.Format<"uuid">),
        created_at: toISOStringSafe(targetComment.created_at) as string &
          tags.Format<"date-time">,
      }
    : null;

  const targetCommunitySummary = targetCommunity
    ? {
        id: targetCommunity.id as string & tags.Format<"uuid">,
        name: targetCommunity.name,
        display_title: targetCommunity.display_title,
        description: targetCommunity.description,
        visibility: targetCommunity.visibility,
        image_url:
          typeof targetCommunity.image_url === "string"
            ? (targetCommunity.image_url as string & tags.Format<"uri">)
            : undefined,
        status: targetCommunity.status,
      }
    : null;

  return {
    id: moderationAction.id,
    report: {
      id: report.id as string & tags.Format<"uuid">,
    },
    targetPost: targetPostSummary,
    targetComment: targetCommentSummary,
    targetCommunity: targetCommunitySummary,
    action_type: moderationAction.action_type,
    result: moderationAction.result,
    status: moderationAction.status,
    created_at: toISOStringSafe(moderationAction.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(moderationAction.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      moderationAction.deleted_at !== null &&
      moderationAction.deleted_at !== undefined
        ? (toISOStringSafe(moderationAction.deleted_at) as string &
            tags.Format<"date-time">)
        : undefined,
  };
}
