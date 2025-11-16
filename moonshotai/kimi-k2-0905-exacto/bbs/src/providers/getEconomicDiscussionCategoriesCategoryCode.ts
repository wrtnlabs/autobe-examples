import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";

export async function getEconomicDiscussionCategoriesCategoryCode(props: {
  categoryCode: string;
}): Promise<IEconomicDiscussionCategory> {
  const category =
    await MyGlobal.prisma.economic_discussion_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description:
      category.description === null ? undefined : category.description,
    display_order: category.display_order,
    is_active: category.is_active,
    article_count: category.article_count,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at:
      category.deleted_at === null
        ? null
        : toISOStringSafe(category.deleted_at),
  };
}
