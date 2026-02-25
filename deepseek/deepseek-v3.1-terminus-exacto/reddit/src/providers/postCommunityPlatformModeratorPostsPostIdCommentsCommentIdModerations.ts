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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentModerationTransformer } from "../transformers/CommunityPlatformCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorPostsPostIdCommentsCommentIdModerations(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentModeration.ICreate;
}): Promise<ICommunityPlatformCommentModeration> {
  // Verify that the comment exists and belongs to the specified post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        post: { id: props.postId },
      },
      select: { id: true },
    });
  // Verify moderator permissions for the comment's community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { community_id: true },
    },
  );
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        moderator_id: props.moderator.id,
        community_id: post.community_id,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator permissions for this community",
      403,
    );
  }
  // Validate action_type against allowed values
  const allowedActions = ["delete", "approve", "ban_user", "remove_ban"];
  if (!allowedActions.includes(props.body.action_type)) {
    throw new HttpException(
      `Invalid action type: ${props.body.action_type}`,
      400,
    );
  }
  // Validate duration_hours for ban actions
  if (props.body.action_type === "ban_user" && !props.body.duration_hours) {
    throw new HttpException("Duration hours is required for ban actions", 400);
  }
  // Create the moderation record using the Collector
  const moderation =
    await MyGlobal.prisma.community_platform_comment_moderations.create({
      data: await CommunityPlatformCommentModerationCollector.collect({
        body: props.body,
        communityPlatformModerators: { id: props.moderator.id },
        communityPlatformComments: { id: props.commentId },
      }),
      ...CommunityPlatformCommentModerationTransformer.select(),
    });
  // Update comment status if action_type is 'delete' or 'approve'
  if (
    props.body.action_type === "delete" ||
    props.body.action_type === "approve"
  ) {
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        is_deleted: props.body.action_type === "delete" ? true : false,
        updated_at: new Date(),
      },
    });
  }
  // Create community ban record for ban actions
  if (props.body.action_type === "ban_user") {
    const commentAuthor =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: props.commentId },
        select: { community_platform_user_id: true },
      });
    if (commentAuthor) {
      await MyGlobal.prisma.community_platform_community_bans.create({
        data: {
          id: v4(),
          community_id: post.community_id,
          user_id: commentAuthor.community_platform_user_id,
          moderator_id: props.moderator.id,
          reason: props.body.reason,
          duration_hours: props.body.duration_hours!,
          status: "active",
          created_at: new Date(),
          updated_at: new Date(),
          expired_at: props.body.duration_hours
            ? new Date(Date.now() + props.body.duration_hours * 60 * 60 * 1000)
            : null,
        },
      });
    }
  }
  // Transform and return the created moderation record
  return await CommunityPlatformCommentModerationTransformer.transform(
    moderation,
  );
}
