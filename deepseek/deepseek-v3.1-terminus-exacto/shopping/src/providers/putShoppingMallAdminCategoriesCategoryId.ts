import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Check if category exists
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });

  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  // Validate parent_id if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    // Check if parent category exists and is not deleted
    const parentCategory =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
      });

    if (!parentCategory) {
      throw new HttpException("Parent category not found", 400);
    }

    // Check for circular reference using a more efficient approach
    if (props.body.parent_id === props.categoryId) {
      throw new HttpException("Category cannot be its own parent", 400);
    }

    // Check if the parent is a descendant of this category
    const isDescendant = await checkIfCategoryIsDescendant(
      props.body.parent_id,
      props.categoryId,
    );
    if (isDescendant) {
      throw new HttpException(
        "Circular reference detected: parent category cannot be a descendant",
        400,
      );
    }
  }

  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingCategoryWithSameName =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.categoryId },
          deleted_at: null,
        },
      });

    if (existingCategoryWithSameName) {
      throw new HttpException("Category name must be unique", 400);
    }
  }

  // Perform the update with proper Prisma syntax
  const updatedCategory = await MyGlobal.prisma.shopping_mall_categories.update(
    {
      where: { id: props.categoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.display_order !== undefined && {
          display_order: props.body.display_order,
        }),
        ...(props.body.active !== undefined && { active: props.body.active }),
        ...(props.body.parent_id !== undefined && {
          parent_id: props.body.parent_id,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            display_order: true,
            active: true,
            parent_id: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    },
  );

  // Build the response with proper null/undefined handling
  const response: IShoppingMallCategory = {
    id: updatedCategory.id,
    name: updatedCategory.name,
    display_order: updatedCategory.display_order,
    active: updatedCategory.active,
    created_at: toISOStringSafe(updatedCategory.created_at),
    updated_at: toISOStringSafe(updatedCategory.updated_at),
    ...(updatedCategory.description !== null && {
      description: updatedCategory.description,
    }),
    ...(updatedCategory.parent && {
      parent: {
        id: updatedCategory.parent.id,
        name: updatedCategory.parent.name,
        display_order: updatedCategory.parent.display_order,
        active: updatedCategory.parent.active,
        parent_id:
          updatedCategory.parent.parent_id !== null
            ? (updatedCategory.parent.parent_id satisfies string &
                tags.Format<"uuid"> as string & tags.Format<"uuid">)
            : (updatedCategory.parent.id satisfies string &
                tags.Format<"uuid"> as string & tags.Format<"uuid">),
        created_at: toISOStringSafe(updatedCategory.parent.created_at),
        updated_at: toISOStringSafe(updatedCategory.parent.updated_at),
        ...(updatedCategory.parent.description !== null && {
          description: updatedCategory.parent.description,
        }),
      },
    }),
    ...(updatedCategory.deleted_at !== null && {
      deleted_at: toISOStringSafe(updatedCategory.deleted_at),
    }),
  };

  return response;
}

// Helper function to check if a category is a descendant of another
async function checkIfCategoryIsDescendant(
  candidateId: string,
  targetId: string,
): Promise<boolean> {
  let currentId: string | null = candidateId;

  while (currentId !== null) {
    const category: { parent_id: string | null } | null =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: { id: currentId, deleted_at: null },
        select: { parent_id: true },
      });

    if (!category) break;

    if (category.parent_id === targetId) {
      return true;
    }

    currentId = category.parent_id;
  }

  return false;
}
