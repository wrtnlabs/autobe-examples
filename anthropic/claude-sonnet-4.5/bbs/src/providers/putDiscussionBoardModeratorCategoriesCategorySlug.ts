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

export async function putDiscussionBoardModeratorCategoriesCategorySlug(props: {
  moderator: ModeratorPayload;
  categorySlug: string;
  body: IDiscussionBoardCategory.IUpdate;
}): Promise<IDiscussionBoardCategory> {
  const { moderator, categorySlug, body } = props;

  // Find the category by slug
  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: {
      slug: categorySlug,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // If name is being updated, check for uniqueness and regenerate slug
  let newSlug: string | undefined = undefined;
  if (body.name !== undefined) {
    const existingCategory =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          name: body.name,
          id: {
            not: category.id,
          },
        },
      });

    if (existingCategory) {
      throw new HttpException("Category name already exists", 409);
    }

    // Generate new slug from updated name
    newSlug = body.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if generated slug conflicts with another category
    const slugConflict =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          slug: newSlug,
          id: {
            not: category.id,
          },
        },
      });

    if (slugConflict) {
      throw new HttpException(
        "Generated slug conflicts with existing category",
        409,
      );
    }
  }

  // Update the category
  const updated = await MyGlobal.prisma.discussion_board_categories.update({
    where: {
      id: category.id,
    },
    data: {
      name: body.name ?? undefined,
      description:
        body.description !== undefined ? body.description : undefined,
      slug: newSlug ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated category
  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    description: updated.description ?? undefined,
    slug: updated.slug,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
