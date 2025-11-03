import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId, commentId } = props;

  // Verify parent article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true },
  });
  if (!article) throw new HttpException("Not Found", 404);

  // Fetch the comment and validate ownership and association
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      discussion_board_article_id: true,
      discussion_board_author_id: true,
      deleted_at: true,
    },
  });
  if (!comment) throw new HttpException("Not Found", 404);
  if (comment.discussion_board_article_id !== articleId)
    throw new HttpException("Not Found", 404);

  // Authorization: only the original author may perform this operation
  if (comment.discussion_board_author_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the comment author may delete this comment",
      403,
    );
  }

  // Idempotent: if already soft-deleted, succeed silently
  if (comment.deleted_at !== null) return;

  // Prevent deletion if there is active moderation work (reports/appeals)
  const activeReport = await MyGlobal.prisma.discussion_board_reports.findFirst(
    {
      where: {
        target_type: "comment",
        target_id: commentId,
        NOT: { status: "resolved" },
      },
      select: { id: true },
    },
  );
  if (activeReport)
    throw new HttpException(
      "Conflict: active moderation in progress for this comment",
      409,
    );

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Soft-delete the comment
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });

  // Record an audit entry describing the author-driven deletion
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "comment.deleted",
      event_payload: JSON.stringify({
        actor: { type: "member", id: member.id },
        reason: "author_deleted",
        article_id: articleId,
        comment_id: commentId,
      }),
      occurred_at: now,
    } satisfies Prisma.discussion_board_moderation_auditCreateInput,
  });
}
