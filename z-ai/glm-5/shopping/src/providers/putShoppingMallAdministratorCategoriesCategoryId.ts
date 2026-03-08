import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Query the category to update
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        parent_id: true,
        deleted_at: true,
      },
    });
  // Reject updates to deleted categories
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // Validate name uniqueness if provided
  if (props.body.name !== undefined) {
    const existingCategory =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.categoryId },
          deleted_at: null,
        },
      });
    if (existingCategory !== null) {
      throw new HttpException("Category name already exists", 400);
    }
  }
  // Validate parentId if provided
  if (props.body.parentId !== undefined) {
    // Check if category has children (cannot reassign parent if so)
    const childrenCount = await MyGlobal.prisma.shopping_mall_categories.count({
      where: { parent_id: props.categoryId, deleted_at: null },
    });
    if (props.body.parentId === null) {
      // Making it a top-level category
      if (childrenCount > 0) {
        throw new HttpException(
          "Cannot remove parent: category has subcategories",
          400,
        );
      }
    } else {
      // Validate parent exists and is not deleted
      const parentCategory =
        await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
          where: { id: props.body.parentId },
          select: { id: true, parent_id: true, deleted_at: true },
        });
      if (parentCategory.deleted_at !== null) {
        throw new HttpException("Parent category not found", 404);
      }
      // Validate parent is top-level (one level nesting limit)
      if (parentCategory.parent_id !== null) {
        throw new HttpException("Parent must be a top-level category", 400);
      }
      // Cannot reassign parent if category has children
      if (childrenCount > 0) {
        throw new HttpException(
          "Cannot reassign parent: category has subcategories",
          400,
        );
      }
      // Prevent self-reference
      if (props.body.parentId === props.categoryId) {
        throw new HttpException("Category cannot be its own parent", 400);
      }
    }
  }
  // Update category with manual select for proper typing
  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parentId !== undefined && {
        parent_id: props.body.parentId,
      }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          parent: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  // Manually construct response to match IShoppingMallCategory
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    parent: updated.parent
      ? {
          id: updated.parent.id,
          name: updated.parent.name,
          description: updated.parent.description,
          parent: updated.parent.parent
            ? {
                id: updated.parent.parent.id,
                name: updated.parent.parent.name,
                description: updated.parent.parent.description,
                parent: null,
                created_at: updated.parent.parent.created_at.toISOString(),
              }
            : null,
          created_at: updated.parent.created_at.toISOString(),
        }
      : null,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  } satisfies IShoppingMallCategory;
}
