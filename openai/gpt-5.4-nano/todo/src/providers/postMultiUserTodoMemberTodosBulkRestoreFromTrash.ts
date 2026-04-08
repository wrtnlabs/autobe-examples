import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodosBulkRestoreFromTrash(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IBulkRestoreFromTrashRequest;
}): Promise<IMultiUserTodoTodo.IBulkRestoreFromTrashResult> {
  const uniqueTodoIds: Array<string & tags.Format<"uuid">> = Array.from(
    new Set(props.body.todoIds),
  );
  const results: IMultiUserTodoTodo.IBulkRestoreFromTrashResultItem[] =
    uniqueTodoIds.map(() => ({
      todoId: null,
      success: false,
      errorMessage: null,
    }));
  const resultByTodoId = new Map<
    string & tags.Format<"uuid">,
    IMultiUserTodoTodo.IBulkRestoreFromTrashResultItem
  >();
  for (let i = 0; i < uniqueTodoIds.length; i++) {
    resultByTodoId.set(uniqueTodoIds[i], results[i]);
  }
  const trashedTodos = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: {
      id: { in: uniqueTodoIds },
      deleted_at: { not: null },
    },
    select: { id: true },
  });
  const trashedTodoIdSet = new Set(trashedTodos.map((t) => t.id));
  const ownedTodoIdsFromHistory =
    await MyGlobal.prisma.multi_user_todo_todo_edit_history_entries.findMany({
      where: {
        multi_user_todo_owner_id: props.member.id,
        multi_user_todo_todo_id: { in: uniqueTodoIds },
      },
      select: { multi_user_todo_todo_id: true },
    });
  const ownedTodoIdSet = new Set(
    ownedTodoIdsFromHistory.map((e) => e.multi_user_todo_todo_id),
  );
  const ineligibleTodoIds: Array<string & tags.Format<"uuid">> = [];
  for (const todoId of uniqueTodoIds) {
    const isOwned = ownedTodoIdSet.has(todoId);
    const isInTrash = trashedTodoIdSet.has(todoId);
    if (!isOwned || !isInTrash) {
      ineligibleTodoIds.push(todoId);
      const item = resultByTodoId.get(todoId);
      if (item) {
        item.success = false;
        item.errorMessage = null;
      }
    }
  }
  if (ineligibleTodoIds.length > 0) {
    return {
      results,
      operationSummary: {
        totalRequested: uniqueTodoIds.length,
        totalRestored: 0,
      },
    };
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const todoId of uniqueTodoIds) {
      if (!ownedTodoIdSet.has(todoId) || !trashedTodoIdSet.has(todoId))
        continue;
      await tx.multi_user_todo_todos.update({
        where: { id: todoId },
        data: {
          deleted_at: null,
          lifecycle_state: "normal",
        },
        select: { id: true },
      });
    }
  });
  for (const item of results) {
    item.success = true;
    item.errorMessage = null;
  }
  return {
    results,
    operationSummary: {
      totalRequested: uniqueTodoIds.length,
      totalRestored: results.length,
    },
  };
}
