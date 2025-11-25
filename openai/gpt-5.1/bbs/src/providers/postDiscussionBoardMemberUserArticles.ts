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

export async function postDiscussionBoardMemberUserArticles(props: {
  memberUser: MemberuserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const { memberUser, body } = props;

  // Validate that the referenced category exists and is not deleted.
  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        id: body.categoryId,
        deleted_at: null,
      },
    });

  if (category === null) {
    throw new HttpException("Category not found", 400);
  }

  // Server-managed timestamps
  const now = new Date();

  // Create the core article row. Prisma error indicated that created_at and updated_at
  // are required fields in the unchecked create input, so we set them explicitly.
  const createdArticle = await MyGlobal.prisma.discussion_board_articles.create(
    {
      data: {
        id: v4(),
        title: body.title,
        body: body.body,
        summary: body.summary === undefined ? null : body.summary,
        discussion_board_article_category_id: body.categoryId,
        moderation_state: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Create authorship subtype linking article to the member user.
  // Compilation error shows that created_at is required in the unchecked create input,
  // so we provide it here as well.
  await MyGlobal.prisma.discussion_board_article_of_memberusers.create({
    data: {
      id: v4(),
      discussion_board_article_id: createdArticle.id,
      discussion_board_memberuser_id: memberUser.id,
      created_at: now,
    },
  });

  // Reload the article to ensure we have persisted timestamps as Date objects.
  const reloadedArticle =
    await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: { id: createdArticle.id },
    });

  if (reloadedArticle === null) {
    throw new HttpException("Failed to load created article", 500);
  }

  // Build the response DTO using the article row and the already-fetched category entity.
  const result: IDiscussionBoardArticle = {
    id: reloadedArticle.id as string & tags.Format<"uuid">,
    title: reloadedArticle.title,
    body: reloadedArticle.body,
    summary: reloadedArticle.summary,
    category: {
      id: category.id as string & tags.Format<"uuid">,
      code: category.code,
      name: category.name,
      description: category.description,
    },
    moderationState: reloadedArticle.moderation_state,
    createdAt: toISOStringSafe(reloadedArticle.created_at),
    updatedAt: toISOStringSafe(reloadedArticle.updated_at),
  };

  return result;
}
