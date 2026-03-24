import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // validations
  const title = props.body.title;
  if (title.length < 1) throw new HttpException("title is required", 400);
  const description = props.body.description ?? null;
  const start_date = props.body.start_date ?? null;
  const due_date = props.body.due_date ?? null;
  const created_at: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const updated_at: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const todo = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      todo_app_member_id: props.member.id,
      title,
      description,
      start_date,
      due_date,
      completion_status: false,
      created_at,
      updated_at,
      deleted_at: null,
      deleted_in_trash_at: null,
    },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(todo);
}
