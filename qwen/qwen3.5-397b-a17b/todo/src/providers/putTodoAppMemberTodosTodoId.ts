import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
  });
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      updated_at: new Date(),
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date,
      }),
    },
  });
  const hasChanges =
    props.body.title !== undefined ||
    props.body.description !== undefined ||
    props.body.start_date !== undefined ||
    props.body.due_date !== undefined;
  if (hasChanges) {
    await MyGlobal.prisma.todo_app_todo_edit_histories.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        created_at: new Date(),
        title: props.body.title !== undefined ? props.body.title : null,
        description:
          props.body.description !== undefined ? props.body.description : null,
        started_at:
          props.body.start_date !== undefined ? props.body.start_date : null,
        due_at: props.body.due_date !== undefined ? props.body.due_date : null,
      },
    });
  }
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
