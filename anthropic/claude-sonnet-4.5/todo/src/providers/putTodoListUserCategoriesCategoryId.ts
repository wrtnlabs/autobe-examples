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

export async function putTodoListUserCategoriesCategoryId(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
  body: ITodoListCategory.IUpdate;
}): Promise<ITodoListCategory> {
  const existing = await MyGlobal.prisma.todo_list_categories.findUnique({
    where: { id: props.categoryId },
  });

  if (!existing) {
    throw new HttpException("Category not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  try {
    const updated = await MyGlobal.prisma.todo_list_categories.update({
      where: { id: props.categoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        updated_at: new Date(),
      },
    });

    return {
      id: updated.id,
      todo_list_user_id: updated.todo_list_user_id,
      name: updated.name,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Category name already exists", 400);
    }
    throw error;
  }
}
