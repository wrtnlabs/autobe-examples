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

export async function postTodoListUserCategories(props: {
  user: UserPayload;
  body: ITodoListCategory.ICreate;
}): Promise<ITodoListCategory> {
  const existingCategory = await MyGlobal.prisma.todo_list_categories.findFirst(
    {
      where: {
        todo_list_user_id: props.user.id,
        name: props.body.name,
      },
    },
  );

  if (existingCategory !== null) {
    throw new HttpException("A category with this name already exists", 409);
  }

  const now = new Date();
  const categoryId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.todo_list_categories.create({
    data: {
      id: categoryId,
      todo_list_user_id: props.user.id,
      name: props.body.name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
