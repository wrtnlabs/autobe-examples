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
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const existing = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!existing) {
    throw new HttpException("Comment not found", 404);
  }

  if (existing.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }

  if (existing.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You are not authorized to update this comment",
      403,
    );
  }

  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });

  const commentMember =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: updated.discussion_board_member_id },
    });

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: updated.discussion_board_article_id },
  });

  const articleAuthor =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: article!.discussion_board_member_id },
    });

  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    member_id: updated.discussion_board_member_id,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
    member: {
      id: commentMember!.id,
      username: commentMember!.username,
      email: commentMember!.email,
      status: commentMember!.status,
      email_verified: commentMember!.email_verified,
      created_at: toISOStringSafe(commentMember!.created_at),
    },
    article: {
      id: article!.id,
      title: article!.title,
      view_count: article!.view_count,
      created_at: toISOStringSafe(article!.created_at),
      updated_at: toISOStringSafe(article!.updated_at),
      author: {
        id: articleAuthor!.id,
        username: articleAuthor!.username,
        email: articleAuthor!.email,
        status: articleAuthor!.status,
        email_verified: articleAuthor!.email_verified,
        created_at: toISOStringSafe(articleAuthor!.created_at),
      },
    },
  };
}
