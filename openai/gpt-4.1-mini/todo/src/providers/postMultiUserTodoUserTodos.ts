import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoCollector } from "../collectors/MultiUserTodoTodoCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoUserTodos(props: {
  user: UserPayload;
  body: IMultiUserTodoTodo.ICreate;
}): Promise<IMultiUserTodoTodo> {
  if (
    !("title" in props.body) ||
    !props.body.title ||
    typeof props.body.title !== "string" ||
    props.body.title.trim().length === 0
  ) {
    throw new HttpException("Title is required", 400);
  }
  const nowDate = new Date();
  const id = v4();
  const data = await MultiUserTodoTodoCollector.collect({
    body: props.body,
    user: {
      id: props.user.id,
    },
  });
  data.id = id;
  data.completed = false;
  data.created_at = nowDate; // use Date for Prisma
  data.updated_at = nowDate; // use Date for Prisma
  data.deleted_at = null;
  const createData = {
    ...data,
    user: {
      connect: {
        id: props.user.id,
      },
    },
  };
  const created = await MyGlobal.prisma.multi_user_todo_todos.create({
    data: createData,
  });
  return {
    id: created.id,
    multi_user_todo_user_id: created.multi_user_todo_user_id ?? props.user.id,
    title: created.title,
    description: created.description === null ? undefined : created.description,
    start_date:
      created.start_date === null
        ? undefined
        : toISOStringSafe(created.start_date),
    due_date:
      created.due_date === null ? undefined : toISOStringSafe(created.due_date),
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
