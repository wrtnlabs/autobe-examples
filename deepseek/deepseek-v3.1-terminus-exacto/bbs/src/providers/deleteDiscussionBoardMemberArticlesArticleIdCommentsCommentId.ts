import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify parent article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Fetch comment with author relation to check ownership
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });
  // Authorization check - member must own the comment
  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Use transaction for atomic operation
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the comment
    await tx.discussion_board_comments.update({
      where: { id: props.commentId },
      data: { deleted_at: new Date() },
    });
    // Create deletion audit record
    const deletionId = v4();
    await tx.discussion_board_comment_deletions.create({
      data: {
        id: deletionId,
        discussion_board_comment_id: props.commentId,
        actor_type: "member",
        reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at_deletion_record: null,
      },
    });
    // Create member-specific deletion subtype
    await tx.discussion_board_comment_deletion_of_members.create({
      data: {
        id: v4(),
        discussion_board_comment_deletion_id: deletionId,
        discussion_board_member_id: props.member.id,
        discussion_board_member_session_id: props.member.session_id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
}
