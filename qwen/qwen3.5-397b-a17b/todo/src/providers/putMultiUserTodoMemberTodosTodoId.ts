import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodo.IUpdate;
}): Promise<IMultiUserTodoTodo> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, multi_user_todo_member_id: true },
  });
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.multi_user_todo_todosUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.startedAt !== undefined && {
      started_at:
        props.body.startedAt === null ? null : new Date(props.body.startedAt),
    }),
    ...(props.body.dueAt !== undefined && {
      due_at: props.body.dueAt === null ? null : new Date(props.body.dueAt),
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  const historyData: Prisma.multi_user_todo_todo_edit_historiesCreateInput = {
    id: v4() as string & tags.Format<"uuid">,
    todo: { connect: { id: props.todoId } },
    created_at: new Date(),
    title: props.body.title !== undefined ? props.body.title : null,
    description:
      props.body.description !== undefined
        ? (props.body.description ?? null)
        : null,
    started_at:
      props.body.startedAt !== undefined
        ? props.body.startedAt === null
          ? null
          : new Date(props.body.startedAt)
        : null,
    due_at:
      props.body.dueAt !== undefined
        ? props.body.dueAt === null
          ? null
          : new Date(props.body.dueAt)
        : null,
  };
  await MyGlobal.prisma.multi_user_todo_todo_edit_histories.create({
    data: historyData,
  });
  const updated = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow(
    {
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    },
  );
  return await MultiUserTodoTodoTransformer.transform(updated);
}
