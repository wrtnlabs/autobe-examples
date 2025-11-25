import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function getDiscussionBoardCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleCategory> {
  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: props.categoryId },
    });

  if (!category) {
    throw new HttpException("Article category not found", 404);
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sort_order: category.sort_order,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
