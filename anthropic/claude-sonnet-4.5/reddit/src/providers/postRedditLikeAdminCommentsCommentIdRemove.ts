import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminCommentsCommentIdRemove(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRemove;
}): Promise<void> {
  const { admin, commentId, body } = props;

  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: commentId },
    include: {
      post: {
        select: {
          reddit_like_community_id: true,
        },
      },
    },
  });

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: now,
    },
  });

  const moderationActionId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.reddit_like_moderation_actions.create({
    data: {
      id: moderationActionId,
      report_id: body.report_id ?? null,
      moderator_id: null,
      admin_id: admin.id,
      affected_post_id: null,
      affected_comment_id: commentId,
      community_id: comment.post.reddit_like_community_id,
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

  await MyGlobal.prisma.reddit_like_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_member_id: null,
      actor_moderator_id: null,
      actor_admin_id: admin.id,
      related_report_id: body.report_id ?? null,
      related_action_id: moderationActionId,
      related_ban_id: null,
      related_suspension_id: null,
      related_appeal_id: null,
      community_id: comment.post.reddit_like_community_id,
      log_type: "action_taken",
      action_description: `Administrator removed comment for reason: ${body.reason_category}`,
      metadata: null,
      ip_address: null,
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
