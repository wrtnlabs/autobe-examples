import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
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

export async function postMultiUserTodoMemberTodosBulkPermanentDelete(props: {
  member: MemberPayload;
  body: IMultiUserTodo.IBulkPermanentDeleteRequest;
}): Promise<IMultiUserTodo.IBulkPermanentDeleteResult> {
  const ownerId: string & tags.Format<"uuid"> = props.member.id;
  const seen = new Set<string & tags.Format<"uuid">>();
  const uniqueTodoIds: Array<string & tags.Format<"uuid">> = [];
  for (const todoId of props.body.todoIds) {
    if (!seen.has(todoId)) {
      seen.add(todoId);
      uniqueTodoIds.push(todoId);
    }
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const ownedTodos = await tx.multi_user_todo_todos.findMany({
      where: {
        id: { in: uniqueTodoIds },
        editHistoryEntriesByOwners: {
          some: {
            multi_user_todo_owner_id: ownerId,
          },
        },
      },
      select: { id: true },
    });
    if (ownedTodos.length !== uniqueTodoIds.length) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.multi_user_todo_todo_edit_history_entries.deleteMany({
      where: {
        multi_user_todo_todo_id: { in: uniqueTodoIds },
      },
    });
    await tx.multi_user_todo_todos.deleteMany({
      where: {
        id: { in: uniqueTodoIds },
        editHistoryEntriesByOwners: {
          some: {
            multi_user_todo_owner_id: ownerId,
          },
        },
      },
    });
    const deletedCount = Math.trunc(uniqueTodoIds.length);
    return {
      deletedTodoIds: uniqueTodoIds,
      deletedCount,
    };
  });
}
