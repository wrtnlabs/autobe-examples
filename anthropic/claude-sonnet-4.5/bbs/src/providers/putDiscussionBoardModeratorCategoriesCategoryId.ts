import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorCategoriesCategoryId(props: {
  moderator: ModeratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleCategory.IUpdate;
}): Promise<IDiscussionBoardArticleCategory> {
  const existing =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: props.categoryId },
    });

  if (!existing) {
    throw new HttpException("Category not found", 404);
  }

  if (props.body.name !== undefined) {
    const nameConflict =
      await MyGlobal.prisma.discussion_board_article_categories.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.categoryId },
        },
      });

    if (nameConflict) {
      throw new HttpException("Category name already exists", 409);
    }
  }

  if (props.body.slug !== undefined) {
    const slugConflict =
      await MyGlobal.prisma.discussion_board_article_categories.findFirst({
        where: {
          slug: props.body.slug,
          id: { not: props.categoryId },
        },
      });

    if (slugConflict) {
      throw new HttpException("Category slug already exists", 409);
    }
  }

  const updated =
    await MyGlobal.prisma.discussion_board_article_categories.update({
      where: { id: props.categoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.slug !== undefined && { slug: props.body.slug }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.sort_order !== undefined && {
          sort_order: props.body.sort_order,
        }),
        updated_at: new Date(),
      },
    });

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? undefined,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
