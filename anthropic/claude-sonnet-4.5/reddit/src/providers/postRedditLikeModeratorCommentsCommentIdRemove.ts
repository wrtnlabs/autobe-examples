import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorCommentsCommentIdRemove(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRemove;
}): Promise<void> {
  const { moderator, commentId, body } = props;

  // Fetch the comment to be removed
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: commentId },
    select: {
      id: true,
      reddit_like_post_id: true,
      deleted_at: true,
    },
  });

  // Check if already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is already removed", 400);
  }

  // Fetch the post to get community_id
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: comment.reddit_like_post_id },
    select: {
      reddit_like_community_id: true,
    },
  });

  const communityId = post.reddit_like_community_id;

  // Verify moderator has manage_comments permission in this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
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

  // Check if moderator has manage_comments permission
  const permissions = moderatorAssignment.permissions;
  const hasManageCommentsPermission = permissions.includes("manage_comments");

  if (!hasManageCommentsPermission) {
    throw new HttpException(
      "Unauthorized: You do not have permission to manage comments in this community",
      403,
    );
  }

  // Soft delete the comment
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
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
        moderator_id: moderator.id,
        admin_id: null,
        affected_post_id: null,
        affected_comment_id: commentId,
        community_id: communityId,
        action_type: "remove",
        content_type: "comment",
        removal_type: body.removal_type,
        reason_category: body.reason_category,
        reason_text: body.reason_text,
        internal_notes: body.internal_notes ?? null,
        status: "completed",
        created_at: now,
        updated_at: now,
      },
    });

  // Create moderation log entry
  await MyGlobal.prisma.reddit_like_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_member_id: null,
      actor_moderator_id: moderator.id,
      actor_admin_id: null,
      related_report_id: body.report_id ?? null,
      related_action_id: moderationAction.id,
      related_ban_id: null,
      related_suspension_id: null,
      related_appeal_id: null,
      community_id: communityId,
      log_type: "action_taken",
      action_description: `Moderator removed comment for reason: ${body.reason_category}`,
      metadata: null,
      ip_address: null,
      created_at: now,
    },
  });

  // If report_id provided, update report status to reviewed
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
