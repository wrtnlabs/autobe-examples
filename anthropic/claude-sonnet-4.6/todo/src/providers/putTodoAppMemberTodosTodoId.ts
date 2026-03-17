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

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Step 1: Fetch the todo for ownership and state validation
  const existing = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      trashed_at: true,
    },
  });
  // Step 2: Ownership check
  if (existing.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Trashed state check — trashed todos cannot be edited
  if (existing.trashed_at !== null) {
    throw new HttpException(
      "Todo is in trash. Restore it before editing.",
      400,
    );
  }
  // Step 4: Perform the update
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body.title,
      description: props.body.description ?? null,
      is_completed: props.body.is_completed,
      started_at:
        props.body.started_at !== undefined && props.body.started_at !== null
          ? new Date(props.body.started_at)
          : null,
      due_at:
        props.body.due_at !== undefined && props.body.due_at !== null
          ? new Date(props.body.due_at)
          : null,
      updated_at: new Date(),
    },
  });
  // Step 5: Re-fetch with transformer select and return transformed result
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return TodoAppTodoTransformer.transform(updated);
}
