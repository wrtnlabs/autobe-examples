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

export async function patchTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistoryEntry.IRequest;
}): Promise<IPageITodoAppTodoHistoryEntry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const todo = await prisma.todo_app_todos.findFirst({
      where: {
        id: props.todoId,
        todo_app_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (todo === null) {
      throw new HttpException("Forbidden", 403);
    }
    const [orderRows, total] = await Promise.all([
      prisma.todo_app_todo_history_entry_order_indexes.findMany({
        where: {
          todo_app_todo_id: props.todoId,
          deleted_at: null,
        },
        orderBy: { position: "desc" },
        skip,
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
      }),
      prisma.todo_app_todo_history_entry_order_indexes.count({
        where: {
          todo_app_todo_id: props.todoId,
          deleted_at: null,
        },
      }),
    ]);
    const pages = Math.ceil(total / limit);
    return {
      pagination: typia.assert({
        current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
          page,
        ),
        limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
          limit,
        ),
        records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
          total,
        ),
        pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
          pages,
        ),
      }) satisfies IPage.IPagination,
      data: orderRows.map((row) => {
        const h = row.historyEntry;
        return {
          id: typia.assert<string & tags.Format<"uuid">>(h.id),
          changed_title: h.changed_title === null ? null : h.changed_title,
          changed_description:
            h.changed_description === null ? null : h.changed_description,
          changed_start_date:
            h.changed_start_date === null
              ? null
              : h.changed_start_date.toISOString(),
          changed_due_date:
            h.changed_due_date === null
              ? null
              : h.changed_due_date.toISOString(),
          changed_completion_status:
            h.changed_completion_status === null
              ? null
              : typia.assert<string>(h.changed_completion_status),
          created_at: typia.assert<string & tags.Format<"date-time">>(
            h.created_at.toISOString(),
          ),
          deleted_at:
            h.deleted_at === null
              ? null
              : typia.assert<string & tags.Format<"date-time">>(
                  h.deleted_at.toISOString(),
                ),
        } satisfies ITodoAppTodoHistoryEntry.ISummary;
      }),
    } satisfies IPageITodoAppTodoHistoryEntry.ISummary;
  });
}
