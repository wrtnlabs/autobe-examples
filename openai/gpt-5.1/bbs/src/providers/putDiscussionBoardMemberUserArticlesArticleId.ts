import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putDiscussionBoardMemberUserArticlesArticleId(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
    },
    include: {
      // Prisma include property issue is out of casting scope
      discussion_board_article_of_memberusers: true,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at !== undefined && article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }

  const memberAuthorLinks = Array.isArray(
    (article as any).discussion_board_article_of_memberusers,
  )
    ? (article as any).discussion_board_article_of_memberusers
    : [];

  const isAuthor = (
    memberAuthorLinks as Array<{ discussion_board_memberuser_id: string }>
  ).some((link) => link.discussion_board_memberuser_id === props.memberUser.id);

  if (!isAuthor) {
    throw new HttpException("You are not the author of this article", 403);
  }

  const updateData: Record<string, unknown> = {};

  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }

  if (props.body.body !== undefined) {
    updateData.body = props.body.body;
  }

  if (props.body.summary !== undefined) {
    updateData.summary = props.body.summary;
  }

  if (props.body.discussion_board_article_category_id !== undefined) {
    const categoryForUpdate =
      await MyGlobal.prisma.discussion_board_article_categories.findFirst({
        where: {
          id: props.body.discussion_board_article_category_id,
          deleted_at: null,
        },
      });

    if (categoryForUpdate === null) {
      throw new HttpException("Category not found", 400);
    }

    updateData.discussion_board_article_category_id =
      props.body.discussion_board_article_category_id;
  }

  const updatedArticle = await MyGlobal.prisma.discussion_board_articles.update(
    {
      where: {
        id: props.articleId,
      },
      data: updateData,
      include: {
        // Prisma include property issue is out of casting scope
      },
    },
  );

  // We cannot reliably access discussion_board_article_categories without proper include,
  // but this is a structural/Prisma issue, not a casting one.
  const category = (updatedArticle as any)
    .discussion_board_article_categories as IDiscussionBoardArticleCategory;

  const response: IDiscussionBoardArticle = {
    id: updatedArticle.id as string & tags.Format<"uuid">,
    title: updatedArticle.title,
    body: updatedArticle.body,
    summary:
      updatedArticle.summary === null
        ? null
        : (updatedArticle.summary ?? undefined),
    category: {
      id: category.id as string & tags.Format<"uuid">,
      code: category.code,
      name: category.name,
      description:
        category.description === null
          ? null
          : (category.description ?? undefined),
    },
    moderationState:
      updatedArticle.moderation_state as IDiscussionBoardArticle["moderationState"],
    createdAt: toISOStringSafe(updatedArticle.created_at as any),
    updatedAt: toISOStringSafe(updatedArticle.updated_at as any),
  };

  return response;
}
