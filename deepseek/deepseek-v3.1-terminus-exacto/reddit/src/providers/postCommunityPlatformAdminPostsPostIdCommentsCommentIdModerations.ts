import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentModerationCollector } from "../collectors/CommunityPlatformCommentModerationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentModerationTransformer } from "../transformers/CommunityPlatformCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPostsPostIdCommentsCommentIdModerations(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentModeration.ICreate;
}): Promise<ICommunityPlatformCommentModeration> {
  // Validate action_type against allowed values
  const allowedActions = ["delete", "approve", "ban_user", "remove_ban"];
  if (!allowedActions.includes(props.body.action_type)) {
    throw new HttpException(
      `Invalid action_type: ${props.body.action_type}. Allowed values: ${allowedActions.join(", ")}`,
      400,
    );
  }
  // For ban actions, validate duration_hours is provided
  if (props.body.action_type === "ban_user" && !props.body.duration_hours) {
    throw new HttpException(
      "duration_hours is required for ban_user action",
      400,
    );
  }
  // Verify comment exists and belongs to the specified post, and get community context
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_user_id: true,
        post: {
          select: {
            community_id: true,
          },
        },
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Verify admin exists and is active
  const adminRecord =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: props.admin.id, deleted_at: null, is_active: true },
    });
  // Create moderation record using collector
  const moderation =
    await MyGlobal.prisma.community_platform_comment_moderations.create({
      data: await CommunityPlatformCommentModerationCollector.collect({
        body: props.body,
        communityPlatformModerators: { id: props.admin.id },
        communityPlatformComments: { id: props.commentId },
      }),
      ...CommunityPlatformCommentModerationTransformer.select(),
    });
  // Handle additional actions based on action_type
  const now = new Date();
  if (props.body.action_type === "delete") {
    // Delete the comment
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: { deleted_at: now },
    });
  } else if (props.body.action_type === "approve") {
    // Approve the comment (if it was previously flagged)
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: { deleted_at: null },
    });
  } else if (props.body.action_type === "ban_user") {
    // Create community ban for the comment author
    const banExpiresAt = new Date(
      Date.now() + props.body.duration_hours! * 60 * 60 * 1000,
    );
    const banData = {
      id: v4(),
      community_id: comment.post.community_id,
      user_id: comment.community_platform_user_id,
      moderator_id: props.admin.id,
      reason: props.body.reason,
      status: "active",
      banned_at: now,
      expires_at: banExpiresAt,
      created_at: now,
      updated_at: now,
    };
    await MyGlobal.prisma.community_platform_community_bans.create({
      data: banData,
    });
  } else if (props.body.action_type === "remove_ban") {
    // Remove any active bans for this user in the community
    await MyGlobal.prisma.community_platform_community_bans.updateMany({
      where: {
        community_id: comment.post.community_id,
        user_id: comment.community_platform_user_id,
        status: "active",
      },
      data: {
        status: "removed",
        updated_at: now,
      },
    });
  }
  // Transform and return the moderation record
  return await CommunityPlatformCommentModerationTransformer.transform(
    moderation,
  );
}
