import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconPolDiscussionBoardMemberEconPolDiscussionBoardCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardComment> {
  const comment =
    await MyGlobal.prisma.econ_pol_discussion_board_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const article =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: comment.econ_pol_discussion_board_article_id },
    });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const author =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: comment.econ_pol_discussion_board_member_id },
    });

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  return {
    id: comment.id,
    article: {
      id: article.id,
      title: article.title,
      author: {
        id: author.id,
        username: author.username,
        displayName: author.username,
        avatarUrl: null,
        memberSince: toISOStringSafe(author.created_at),
      },
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    },
    author: {
      id: author.id,
      username: author.username,
      displayName: author.username,
      avatarUrl: null,
      memberSince: toISOStringSafe(author.created_at),
    },
    parent_id: comment.parent_comment_id ?? undefined,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    children_count: undefined,
    children: undefined,
  };
}
