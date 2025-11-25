import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postEconomicDiscussionModeratorArticlesArticleIdCategoriesCategoryCode(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  categoryCode: string;
}): Promise<void> {
  // Verify the article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Verify the category exists
  const category =
    await MyGlobal.prisma.economic_discussion_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Check if association already exists (prevent duplicates)
  const existing =
    await MyGlobal.prisma.economic_discussion_article_categories.findFirst({
      where: {
        economic_discussion_article_id: props.articleId,
        economic_discussion_category_id: category.id,
      },
    });

  if (existing) {
    throw new HttpException(
      "Article is already associated with this category",
      409,
    );
  }

  // Create the association
  await MyGlobal.prisma.economic_discussion_article_categories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_discussion_article_id: props.articleId,
      economic_discussion_category_id: category.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
