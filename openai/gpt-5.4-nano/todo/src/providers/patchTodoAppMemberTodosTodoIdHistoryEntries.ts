import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
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

export async function patchTodoAppMemberTodosTodoIdHistoryEntries(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistoryEntry.IRequest;
}): Promise<IPageITodoAppTodoHistoryEntry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const orderRows =
    await MyGlobal.prisma.todo_app_todo_history_entry_order_indexes.findMany({
      where: {
        todo_app_todo_id: todo.id,
        deleted_at: null,
        historyEntry: {
          deleted_at: null,
        },
      },
      orderBy: { position: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        historyEntry: {
          select: {
            id: true,
            changed_title: true,
            changed_description: true,
            changed_start_date: true,
            changed_due_date: true,
            changed_completion_status: true,
            created_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const records =
    await MyGlobal.prisma.todo_app_todo_history_entry_order_indexes.count({
      where: {
        todo_app_todo_id: todo.id,
        deleted_at: null,
        historyEntry: {
          deleted_at: null,
        },
      },
    });
  const data: ITodoAppTodoHistoryEntry.ISummary[] = orderRows.map((row) => {
    const e = row.historyEntry;
    return {
      id: typia.assert<string & tags.Format<"uuid">>(e.id),
      changed_title: e.changed_title ?? null,
      changed_description: e.changed_description ?? null,
      changed_start_date: e.changed_start_date
        ? typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(e.changed_start_date),
          )
        : null,
      changed_due_date: e.changed_due_date
        ? typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(e.changed_due_date),
          )
        : null,
      changed_completion_status: e.changed_completion_status ?? null,
      created_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(e.created_at),
      ),
      deleted_at: e.deleted_at
        ? typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(e.deleted_at),
          )
        : null,
    };
  });
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
  };
}
