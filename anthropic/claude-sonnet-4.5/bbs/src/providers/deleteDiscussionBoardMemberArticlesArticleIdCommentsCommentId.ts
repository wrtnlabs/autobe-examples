import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, commentId } = props;

  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: commentId },
    });

  if (comment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }

  if (comment.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own comments",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return {
    id: comment.id,
    discussion_board_article_id: comment.discussion_board_article_id,
    discussion_board_parent_comment_id:
      comment.discussion_board_parent_comment_id ?? null,
    discussion_board_member_id: comment.discussion_board_member_id ?? null,
    discussion_board_moderator_id:
      comment.discussion_board_moderator_id ?? null,
    author_type: comment.author_type,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: now,
    deleted_at: now,
    memberAuthor: null,
    moderatorAuthor: null,
  };
}
