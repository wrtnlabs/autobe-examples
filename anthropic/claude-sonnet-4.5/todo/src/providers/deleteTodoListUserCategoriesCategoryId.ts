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

export async function deleteTodoListUserCategoriesCategoryId(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ITodoListCategory> {
  const category = await MyGlobal.prisma.todo_list_categories.findUnique({
    where: { id: props.categoryId },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  if (category.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own categories",
      403,
    );
  }

  const deleted = await MyGlobal.prisma.todo_list_categories.delete({
    where: { id: props.categoryId },
  });

  return {
    id: deleted.id,
    todo_list_user_id: deleted.todo_list_user_id,
    name: deleted.name,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
  };
}
