import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminPostsPostIdRemove(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IRemove;
}): Promise<void> {
  const { admin, postId, body } = props;

  // Verify post exists and get community context
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
    select: {
      id: true,
      reddit_like_community_id: true,
      deleted_at: true,
    },
  });

  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post is already removed", 400);
  }

  const now = toISOStringSafe(new Date());

  // Perform soft delete on the post
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Create moderation action record
  const moderationAction =
    await MyGlobal.prisma.reddit_like_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        report_id: body.report_id ?? null,
        moderator_id: null,
        admin_id: admin.id,
        affected_post_id: postId,
        affected_comment_id: null,
        community_id: post.reddit_like_community_id,
        action_type: "remove",
        content_type: "post",
        removal_type: body.removal_type,
        reason_category: body.reason_category,
        reason_text: body.reason_text,
        internal_notes: body.internal_notes ?? null,
        status: "completed",
        created_at: now,
        updated_at: now,
      },
    });

  // Create moderation log record
  await MyGlobal.prisma.reddit_like_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_member_id: null,
      actor_moderator_id: null,
      actor_admin_id: admin.id,
      related_report_id: body.report_id ?? null,
      related_action_id: moderationAction.id,
      related_ban_id: null,
      related_suspension_id: null,
      related_appeal_id: null,
      community_id: post.reddit_like_community_id,
      log_type: "action_taken",
      action_description: `Administrator removed post: ${body.reason_category}`,
      metadata: JSON.stringify({
        removal_type: body.removal_type,
        reason_category: body.reason_category,
        post_id: postId,
      }),
      ip_address: null,
      created_at: now,
    },
  });

  // Update report status if report_id is provided
  if (body.report_id !== undefined && body.report_id !== null) {
    await MyGlobal.prisma.reddit_like_content_reports.update({
      where: { id: body.report_id },
      data: {
        status: "reviewed",
        updated_at: now,
      },
    });
  }
}
