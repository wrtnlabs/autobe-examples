import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.todo_list_todos.create({
      data: {
        id: v4(),
        todo_list_user_id: props.user.id,
        title: props.body.title,
        description:
          props.body.description === undefined ? null : props.body.description,
        status: "pending",
        completed_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      title: created.title,
      description: created.description ?? undefined,
      status: created.status === "pending" ? "pending" : "completed",
      completed_at:
        created.completed_at !== null
          ? toISOStringSafe(created.completed_at)
          : undefined,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : undefined,
    };
  } catch (error: any) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "A todo with this title already exists (among your not-deleted todos)",
        409,
      );
    }
    throw new HttpException(
      "Failed to create todo: " + (error?.message || "Unknown error"),
      500,
    );
  }
}
