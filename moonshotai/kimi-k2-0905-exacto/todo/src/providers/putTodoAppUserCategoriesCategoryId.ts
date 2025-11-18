import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserCategoriesCategoryId(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
  body: ITodoAppCategory.IUpdate;
}): Promise<ITodoAppCategory> {
  // Verify category exists and belongs to user
  const existingCategory = await MyGlobal.prisma.todo_app_categories.findUnique(
    {
      where: { id: props.categoryId },
    },
  );

  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  if (existingCategory.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - category does not belong to user",
      403,
    );
  }

  // Build update data with only provided fields
  const updateData: Prisma.todo_app_categoriesUpdateInput = {
    updated_at: new Date(),
  };

  // Handle name update with uniqueness check if provided
  if (props.body.name !== undefined) {
    // Check if another category with this name already exists for this user
    const existingNameCategory =
      await MyGlobal.prisma.todo_app_categories.findFirst({
        where: {
          todo_app_user_id: props.user.id,
          name: props.body.name! satisfies string as string,
          NOT: { id: props.categoryId }, // Exclude current category
        },
      });

    if (existingNameCategory) {
      throw new HttpException("Category name already exists", 409);
    }

    updateData.name = props.body.name! satisfies string as string;
  }

  // Handle description update if provided (can be set to null)
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }

  // Update the category
  const updatedCategory = await MyGlobal.prisma.todo_app_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });

  // Fetch user summary for response
  const userSummary = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!userSummary) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: updatedCategory.id,
    user: {
      id: userSummary.id,
      email: userSummary.email,
      created_at: toISOStringSafe(userSummary.created_at),
      updated_at: toISOStringSafe(userSummary.updated_at),
      deleted_at: userSummary.deleted_at
        ? toISOStringSafe(userSummary.deleted_at)
        : undefined,
    },
    name: updatedCategory.name,
    description: updatedCategory.description,
    created_at: toISOStringSafe(updatedCategory.created_at),
    updated_at: toISOStringSafe(updatedCategory.updated_at),
  };
}
