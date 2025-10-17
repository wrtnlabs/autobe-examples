import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorPostsPostIdRemove(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IRemove;
}): Promise<void> {
  const { moderator, postId, body } = props;

  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
    select: {
      id: true,
      reddit_like_community_id: true,
      deleted_at: true,
    },
  });

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: post.reddit_like_community_id,
        moderator_id: moderator.id,
      },
      select: {
        permissions: true,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  const hasManagePostsPermission =
    moderatorAssignment.permissions.includes("manage_posts");

  if (!hasManagePostsPermission) {
    throw new HttpException(
      "Unauthorized: You do not have 'manage_posts' permission in this community",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  const moderationAction =
    await MyGlobal.prisma.reddit_like_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        report_id: body.report_id ?? undefined,
        moderator_id: moderator.id,
        admin_id: undefined,
        affected_post_id: postId,
        affected_comment_id: undefined,
        community_id: post.reddit_like_community_id,
        action_type: "remove",
        content_type: "post",
        removal_type: body.removal_type,
        reason_category: body.reason_category,
        reason_text: body.reason_text,
        internal_notes: body.internal_notes ?? undefined,
        status: "completed",
        created_at: now,
        updated_at: now,
      },
    });

  await MyGlobal.prisma.reddit_like_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_member_id: undefined,
      actor_moderator_id: moderator.id,
      actor_admin_id: undefined,
      related_report_id: body.report_id ?? undefined,
      related_action_id: moderationAction.id,
      related_ban_id: undefined,
      related_suspension_id: undefined,
      related_appeal_id: undefined,
      community_id: post.reddit_like_community_id,
      log_type: "action_taken",
      action_description: `Moderator removed post: ${body.reason_category}`,
      metadata: JSON.stringify({
        removal_type: body.removal_type,
        reason_category: body.reason_category,
        reason_text: body.reason_text,
      }),
      ip_address: undefined,
      created_at: now,
    },
  });

  if (body.report_id !== undefined) {
    await MyGlobal.prisma.reddit_like_content_reports.update({
      where: { id: body.report_id },
      data: {
        status: "reviewed",
        updated_at: now,
      },
    });
  }
}
