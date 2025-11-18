import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListCategory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserCategoriesCategoryId(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ITodoListCategory> {
  const category = await MyGlobal.prisma.todo_list_categories.findUnique({
    where: {
      id: props.categoryId,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  if (category.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: category.id,
    todo_list_user_id: category.todo_list_user_id,
    name: category.name,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
