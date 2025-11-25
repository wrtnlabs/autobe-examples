import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function getDiscussionBoardArticleCategoriesCategoryCode(props: {
  categoryCode: string;
}): Promise<IDiscussionBoardArticleCategory> {
  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        code: props.categoryCode,
        deleted_at: null,
      },
    });

  if (!category) {
    throw new HttpException("Article category not found", 404);
  }

  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? null,
    order: category.order,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at:
      category.deleted_at === null
        ? null
        : toISOStringSafe(category.deleted_at),
  };
}
