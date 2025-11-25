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

export async function putCommunityPlatformModeratorModerationActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationAction.IUpdate;
}): Promise<ICommunityPlatformModerationAction> {
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findFirst({
      where: {
        id: props.moderationActionId,
        deleted_at: null,
      },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }
  const updated =
    await MyGlobal.prisma.community_platform_moderation_actions.update({
      where: { id: props.moderationActionId },
      data: {
        ...(props.body.action_type !== undefined && {
          action_type: props.body.action_type,
        }),
        ...(props.body.result !== undefined && { result: props.body.result }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.target_post_id !== undefined && {
          target_post_id: props.body.target_post_id,
        }),
        ...(props.body.target_comment_id !== undefined && {
          target_comment_id: props.body.target_comment_id,
        }),
        ...(props.body.target_community_id !== undefined && {
          target_community_id: props.body.target_community_id,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: { id: updated.report_id, deleted_at: null },
    select: { id: true },
  });
  let targetPost: ICommunityPlatformPost.ISummary | undefined = undefined;
  if (updated.target_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: { id: updated.target_post_id, deleted_at: null },
      select: { id: true, community_id: true, user_id: true },
    });
    if (post) {
      targetPost = {
        id: post.id,
        community_id: post.community_id,
        community: undefined,
        user_id: post.user_id,
        user: undefined,
      };
    }
  }
  let targetComment: ICommunityPlatformComment.ISummary | undefined = undefined;
  if (updated.target_comment_id) {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: { id: updated.target_comment_id, deleted_at: null },
        select: { id: true, user_id: true, post_id: true, created_at: true },
      },
    );
    if (comment && comment.post_id && comment.user_id) {
      targetComment = {
        id: comment.id,
        user: { id: comment.user_id },
        post: {
          id: comment.post_id,
          community_id: comment.post_id,
          user_id: comment.user_id,
          community: undefined,
          user: undefined,
        },
        parent_id: undefined,
        created_at: toISOStringSafe(comment.created_at),
      };
    }
  }
  let targetCommunity: ICommunityPlatformCommunity.ISummary | undefined =
    undefined;
  if (updated.target_community_id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: { id: updated.target_community_id, deleted_at: null },
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
      targetCommunity = {
        id: community.id,
        name: community.name,
        display_title: community.display_title,
        description: community.description,
        visibility: community.visibility,
        image_url:
          community.image_url === null ? undefined : community.image_url,
        status: community.status,
      };
    }
  }
  return {
    id: updated.id,
    report: { id: updated.report_id },
    targetPost: targetPost,
    targetComment: targetComment,
    targetCommunity: targetCommunity,
    action_type: updated.action_type,
    result: updated.result,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
