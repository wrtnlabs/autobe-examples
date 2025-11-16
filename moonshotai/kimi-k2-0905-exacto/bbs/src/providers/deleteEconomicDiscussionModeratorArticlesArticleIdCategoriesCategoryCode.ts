import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorArticlesArticleIdCategoriesCategoryCode(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  categoryCode: string;
}): Promise<void> {
  // Find the category by code first to get its ID for the association check
  const category =
    await MyGlobal.prisma.economic_discussion_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!category) {
    throw new HttpException(
      `Category with code '${props.categoryCode}' not found`,
      404,
    );
  }

  // Find the specific association between this article and category
  const association =
    await MyGlobal.prisma.economic_discussion_article_categories.findFirst({
      where: {
        economic_discussion_article_id: props.articleId,
        economic_discussion_category_id: category.id,
      },
    });

  if (!association) {
    throw new HttpException(
      `Article '${props.articleId}' is not associated with category '${props.categoryCode}'`,
      404,
    );
  }

  // Delete the specific association - the unique constraint guarantees we delete the right one
  await MyGlobal.prisma.economic_discussion_article_categories.delete({
    where: {
      id: association.id,
    },
  });
}
