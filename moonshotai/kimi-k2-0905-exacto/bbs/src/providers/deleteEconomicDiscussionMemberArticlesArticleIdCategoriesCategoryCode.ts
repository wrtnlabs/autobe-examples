import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconomicDiscussionMemberArticlesArticleIdCategoriesCategoryCode(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  categoryCode: string;
}): Promise<void> {
  // Verify article exists and belongs to the member
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.economic_discussion_member_id !== props.member.id) {
    throw new HttpException("You can only modify your own articles", 403);
  }

  if (article.deleted_at) {
    throw new HttpException("Article has been deleted", 404);
  }

  // Verify category exists
  const category =
    await MyGlobal.prisma.economic_discussion_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  if (!category.is_active) {
    throw new HttpException("Category is not active", 400);
  }

  // Verify article-category association exists
  const association =
    await MyGlobal.prisma.economic_discussion_article_categories.findFirst({
      where: {
        economic_discussion_article_id: props.articleId,
        economic_discussion_category_id: category.id,
      },
    });

  if (!association) {
    throw new HttpException(
      "Article is not associated with this category",
      404,
    );
  }

  // Delete the association
  await MyGlobal.prisma.economic_discussion_article_categories.delete({
    where: { id: association.id },
  });
}
