import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconomicDiscussionMemberArticlesArticleIdCategoriesCategoryCode(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  categoryCode: string;
}): Promise<void> {
  // Check if article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Get the category by code
  const category =
    await MyGlobal.prisma.economic_discussion_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Check if association already exists
  const existingAssociation =
    await MyGlobal.prisma.economic_discussion_article_categories.findFirst({
      where: {
        economic_discussion_article_id: props.articleId,
        economic_discussion_category_id: category.id,
      },
    });

  if (existingAssociation) {
    throw new HttpException(
      "Article is already associated with this category",
      400,
    );
  }

  // Create the association
  await MyGlobal.prisma.economic_discussion_article_categories.create({
    data: {
      id: v4(),
      economic_discussion_article_id:
        props.articleId satisfies string as string,
      economic_discussion_category_id: category.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
