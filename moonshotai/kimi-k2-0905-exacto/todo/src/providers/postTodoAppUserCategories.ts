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

export async function postTodoAppUserCategories(props: {
  user: UserPayload;
  body: ITodoAppCategory.ICreate;
}): Promise<ITodoAppCategory> {
  // Check if user has reached the 50 category limit
  const categoryCount = await MyGlobal.prisma.todo_app_categories.count({
    where: { todo_app_user_id: props.user.id },
  });

  if (categoryCount >= 50) {
    throw new HttpException("Maximum 50 categories allowed per user", 400);
  }

  // Check for duplicate category name for this user
  const existingCategory = await MyGlobal.prisma.todo_app_categories.findFirst({
    where: {
      todo_app_user_id: props.user.id,
      name: props.body.name,
    },
  });

  if (existingCategory) {
    throw new HttpException("Category name already exists", 400);
  }

  const now = toISOStringSafe(new Date());
  const category = await MyGlobal.prisma.todo_app_categories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: props.user.id,
      name: props.body.name,
      description: props.body.description,
      created_at: now,
      updated_at: now,
    },
  });

  // Get user information for the response
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: category.id,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
    name: category.name,
    description: category.description,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
