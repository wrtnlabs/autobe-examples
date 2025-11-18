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

export async function deleteTodoAppUserCategoriesCategoryId(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppCategory> {
  // First, verify the category exists and belongs to the authenticated user
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
      "You do not have permission to delete this category",
      403,
    );
  }

  // Delete the category (cascades to tasks via foreign key)
  await MyGlobal.prisma.todo_app_categories.delete({
    where: { id: props.categoryId },
  });

  // Get user summary for response
  const userSummary = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: existingCategory.todo_app_user_id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!userSummary) {
    throw new HttpException("Associated user not found", 404);
  }

  // Return the deleted category data formatted as ITodoAppCategory
  return {
    id: existingCategory.id,
    user: {
      id: userSummary.id,
      email: userSummary.email,
      created_at: toISOStringSafe(userSummary.created_at),
      updated_at: toISOStringSafe(userSummary.updated_at),
      deleted_at: userSummary.deleted_at
        ? toISOStringSafe(userSummary.deleted_at)
        : userSummary.deleted_at,
    },
    name: existingCategory.name,
    description: existingCategory.description,
    created_at: toISOStringSafe(existingCategory.created_at),
    updated_at: toISOStringSafe(existingCategory.updated_at),
  };
}
