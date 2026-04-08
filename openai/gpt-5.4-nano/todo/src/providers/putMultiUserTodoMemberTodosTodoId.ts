import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
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
  const accessibleTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findFirstOrThrow({
      where: {
        id: props.todoId,
        deleted_at: null,
        editHistoryEntriesByOwners: {
          some: {
            multi_user_todo_owner_id: props.member.id,
            deleted_at: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_complete: true,
        lifecycle_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const editMadeAtIso: string & tags.Format<"date-time"> = toISOStringSafe(
    accessibleTodo.updated_at,
  );
  const nextDescription =
    props.body.description === undefined
      ? accessibleTodo.description
      : props.body.description;
  const nextStartDate =
    props.body.startDate === undefined
      ? accessibleTodo.start_date
      : props.body.startDate;
  const nextDueDate =
    props.body.dueDate === undefined
      ? accessibleTodo.due_date
      : props.body.dueDate;
  const nextIsComplete =
    props.body.isComplete === undefined
      ? accessibleTodo.is_complete
      : props.body.isComplete;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.multi_user_todo_todos.update({
      where: { id: props.todoId },
      data: {
        title: props.body.title,
        description: nextDescription,
        start_date: nextStartDate,
        due_date: nextDueDate,
        is_complete: nextIsComplete,
        updated_at: editMadeAtIso,
      },
    });
    await tx.multi_user_todo_todo_edit_history_entries.create({
      data: {
        id: v4(),
        multi_user_todo_todo_id: props.todoId,
        multi_user_todo_owner_id: props.member.id,
        edit_made_at: editMadeAtIso,
        previous_title: accessibleTodo.title,
        new_title: props.body.title,
        previous_description: accessibleTodo.description,
        new_description: nextDescription,
        previous_start_date: accessibleTodo.start_date,
        new_start_date: nextStartDate,
        previous_due_date: accessibleTodo.due_date,
        new_due_date: nextDueDate,
        previous_is_complete: accessibleTodo.is_complete,
        new_is_complete: nextIsComplete,
        created_at: editMadeAtIso,
        updated_at: editMadeAtIso,
        deleted_at: null,
      },
    });
  });
  const updated = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow(
    {
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    },
  );
  return MultiUserTodoTodoTransformer.transform(updated);
}
