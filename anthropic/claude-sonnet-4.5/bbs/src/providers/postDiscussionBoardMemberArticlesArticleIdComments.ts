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

export async function postDiscussionBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      member: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const commentId = v4() satisfies string as string;
  const now = new Date();

  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: commentId,
      discussion_board_article_id: props.articleId,
      discussion_board_member_id: props.member.id,
      content: props.body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    member_id: created.discussion_board_member_id,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    member: {
      id: member.id,
      username: member.username,
      email: member.email,
      status: member.status,
      email_verified: member.email_verified,
      created_at: toISOStringSafe(member.created_at),
    },
    article: {
      id: article.id,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      author: {
        id: article.member.id,
        username: article.member.username,
        email: article.member.email,
        status: article.member.status,
        email_verified: article.member.email_verified,
        created_at: toISOStringSafe(article.member.created_at),
      },
    },
  };
}
