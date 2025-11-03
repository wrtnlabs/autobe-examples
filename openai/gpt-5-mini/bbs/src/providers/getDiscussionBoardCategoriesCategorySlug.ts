import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

export async function getDiscussionBoardCategoriesCategorySlug(props: {
  categorySlug: string;
}): Promise<IDiscussionBoardCategory> {
  const { categorySlug } = props;

  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: {
      slug: categorySlug,
      deleted_at: null,
    },
  });

  if (!category) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: category.id as string & tags.Format<"uuid">,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    is_active: category.is_active,
    sort_order:
      category.sort_order === null || category.sort_order === undefined
        ? null
        : (category.sort_order as number & tags.Type<"int32">),
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
