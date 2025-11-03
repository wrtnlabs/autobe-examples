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

  const category =
    await MyGlobal.prisma.discussion_board_categories.findUniqueOrThrow({
      where: { slug: categorySlug },
    });

  return {
    id: category.id as string & tags.Format<"uuid">,
    name: category.name,
    description: category.description,
    slug: category.slug,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
