import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorCategoriesCategorySlug(props: {
  moderator: ModeratorPayload;
  categorySlug: string;
}): Promise<IDiscussionBoardCategory> {
  const { moderator, categorySlug } = props;

  // Find the category by slug to ensure it exists and get its data
  const category =
    await MyGlobal.prisma.discussion_board_categories.findUniqueOrThrow({
      where: { slug: categorySlug },
    });

  // Perform hard delete (no soft delete field available in schema)
  await MyGlobal.prisma.discussion_board_categories.delete({
    where: { slug: categorySlug },
  });

  // Return the deleted category information with proper type conversions
  return {
    id: category.id as string & tags.Format<"uuid">,
    name: category.name,
    description: category.description ?? null,
    slug: category.slug,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
