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

export async function getTodoAppUserCategoriesCategoryId(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppCategory> {
  // Fetch the category from database
  const category = await MyGlobal.prisma.todo_app_categories.findUnique({
    where: { id: props.categoryId },
  });

  // Handle not found case
  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Verify user ownership - category must belong to authenticated user
  if (category.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - category does not belong to user",
      403,
    );
  }

  // Fetch user summary data for the category owner
  const categoryUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: category.todo_app_user_id },
  });

  if (!categoryUser) {
    throw new HttpException("Category owner not found", 404);
  }

  // Transform to DTO format - convert Date objects to ISO strings
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    user: {
      id: categoryUser.id,
      email: categoryUser.email,
      created_at: toISOStringSafe(categoryUser.created_at),
      updated_at: toISOStringSafe(categoryUser.updated_at),
      deleted_at: categoryUser.deleted_at
        ? toISOStringSafe(categoryUser.deleted_at)
        : undefined,
    },
  };
}
