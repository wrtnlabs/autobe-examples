import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putDiscussionBoardAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCategory.IUpdate;
}): Promise<IDiscussionBoardCategory> {
  const { categoryId, body } = props;

  const existingCategory =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: {
        id: categoryId,
        deleted_at: null,
      },
    });

  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  if (body.name !== undefined && body.name !== null) {
    const duplicateName =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          name: body.name,
          id: { not: categoryId },
          deleted_at: null,
        },
      });

    if (duplicateName) {
      throw new HttpException("Category name already exists", 409);
    }
  }

  if (body.slug !== undefined && body.slug !== null) {
    const duplicateSlug =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          slug: body.slug,
          id: { not: categoryId },
          deleted_at: null,
        },
      });

    if (duplicateSlug) {
      throw new HttpException("Category slug already exists", 409);
    }
  }

  if (body.parent_category_id !== undefined) {
    if (body.parent_category_id !== null) {
      const parentCategory =
        await MyGlobal.prisma.discussion_board_categories.findFirst({
          where: {
            id: body.parent_category_id,
            deleted_at: null,
            is_active: true,
          },
        });

      if (!parentCategory) {
        throw new HttpException("Parent category not found or inactive", 400);
      }

      if (body.parent_category_id === categoryId) {
        throw new HttpException("Category cannot be its own parent", 400);
      }

      const checkCircular = async (parentId: string): Promise<boolean> => {
        const parent =
          await MyGlobal.prisma.discussion_board_categories.findFirst({
            where: { id: parentId },
          });

        if (!parent || parent.parent_category_id === null) {
          return false;
        }

        if (parent.parent_category_id === categoryId) {
          return true;
        }

        return checkCircular(parent.parent_category_id);
      };

      const isCircular = await checkCircular(body.parent_category_id);
      if (isCircular) {
        throw new HttpException(
          "Cannot create circular category reference",
          400,
        );
      }
    }
  }

  const updated = await MyGlobal.prisma.discussion_board_categories.update({
    where: { id: categoryId },
    data: {
      name: body.name === null ? undefined : body.name,
      slug: body.slug === null ? undefined : body.slug,
      description: body.description,
      parent_category_id: body.parent_category_id,
      display_order:
        body.display_order === null ? undefined : body.display_order,
      is_active: body.is_active === null ? undefined : body.is_active,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    parent_category_id: updated.parent_category_id as
      | (string & tags.Format<"uuid">)
      | null,
    display_order: Number(updated.display_order),
    is_active: updated.is_active,
    topic_count: Number(updated.topic_count),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
