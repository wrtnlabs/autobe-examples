import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

export async function getDiscussionBoardCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCategory> {
  const { categoryId } = props;

  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: {
      id: categoryId,
      deleted_at: null,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: category.id as string & tags.Format<"uuid">,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parent_category_id:
      category.parent_category_id === null
        ? null
        : (category.parent_category_id as string & tags.Format<"uuid">),
    display_order: category.display_order,
    is_active: category.is_active,
    topic_count: category.topic_count,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
