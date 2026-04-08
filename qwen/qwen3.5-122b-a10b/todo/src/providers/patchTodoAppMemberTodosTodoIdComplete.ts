import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function patchTodoAppMemberTodosTodoIdComplete(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IToggle;
}): Promise<ITodoAppTodo> {
  // Find the todo - verify ownership and not deleted
  const record = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    ...TodoAppTodoTransformer.select(),
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
  });
  // Update the todo with new completion status
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      is_completed: props.body.is_completed,
      updated_at: new Date(),
    },
  });
  // Create snapshot for edit history
  await MyGlobal.prisma.todo_app_snapshots.create({
    data: {
      id: v4(),
      todo_app_todos_id: props.todoId,
      title: record.title,
      description: record.description ?? "",
      start_date: record.start_date,
      due_date: record.due_date,
      is_completed: props.body.is_completed,
      created_at: new Date(),
    },
  });
  // Fetch and return the updated todo
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
