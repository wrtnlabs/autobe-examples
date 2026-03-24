import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppTodoHistoryEntryCollector } from "../collectors/TodoAppTodoHistoryEntryCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryEntryTransformer } from "../transformers/TodoAppTodoHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistoryEntry.ICreate;
}): Promise<ITodoAppTodoHistoryEntry> {
  const hasAnyChange =
    props.body.changedTitle !== undefined && props.body.changedTitle !== null
      ? true
      : props.body.changedDescription !== undefined &&
          props.body.changedDescription !== null
        ? true
        : props.body.changedStartDate !== undefined &&
            props.body.changedStartDate !== null
          ? true
          : props.body.changedDueDate !== undefined &&
              props.body.changedDueDate !== null
            ? true
            : props.body.changedCompletionStatus !== undefined &&
                props.body.changedCompletionStatus !== null
              ? true
              : false;
  if (!hasAnyChange) {
    throw new HttpException("No changes provided", 400);
  }
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const historyEntry = await tx.todo_app_todo_history_entries.create({
      data: await TodoAppTodoHistoryEntryCollector.collect({
        body: props.body,
        todoAppTodos: { id: todo.id } satisfies IEntity,
      }),
      ...TodoAppTodoHistoryEntryTransformer.select(),
    });
    const lastIndex =
      await tx.todo_app_todo_history_entry_order_indexes.findFirst({
        where: {
          todo_app_todo_id: todo.id,
          deleted_at: null,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      });
    const position: number = (lastIndex?.position ?? 0) + 1;
    await tx.todo_app_todo_history_entry_order_indexes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_todo_id: todo.id,
        todo_app_todo_history_entry_id: historyEntry.id,
        position,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return historyEntry;
  });
  return await TodoAppTodoHistoryEntryTransformer.transform(created);
}
