import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const order = props.body.order ?? "desc";

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        ...(props.body.search && {
          content: {
            contains: props.body.search,
          },
        }),
      },
      skip: skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
      include: {
        member: true,
        article: {
          include: {
            member: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: props.articleId,
        ...(props.body.search && {
          content: {
            contains: props.body.search,
          },
        }),
      },
    }),
  ]);

  const data: IDiscussionBoardComment.ISummary[] = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    author: {
      id: comment.member.id,
      username: comment.member.username,
      email: comment.member.email,
      status: comment.member.status,
      email_verified: comment.member.email_verified,
      created_at: toISOStringSafe(comment.member.created_at),
    },
    article: {
      id: comment.article.id,
      title: comment.article.title,
      view_count: comment.article.view_count,
      created_at: toISOStringSafe(comment.article.created_at),
      updated_at: toISOStringSafe(comment.article.updated_at),
      author: {
        id: comment.article.member.id,
        username: comment.article.member.username,
        email: comment.article.member.email,
        status: comment.article.member.status,
        email_verified: comment.article.member.email_verified,
        created_at: toISOStringSafe(comment.article.member.created_at),
      },
    },
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
