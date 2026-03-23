import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function getTodoAppMemberDashboard(props: {
  member: MemberPayload;
}): Promise<ITodoAppDashboard.IOverview> {
  const limit = 20;
  const offset = 0;
  const [todos, totalTodos, completedTodos, editHistoryEntries, users] =
    await Promise.all([
      MyGlobal.prisma.todo_app_todos.findMany({
        where: {
          todo_app_user_id: props.member.id,
          is_trashed: false,
        },
        orderBy: {
          created_at: "desc",
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          is_complete: true,
          created_at: true,
          start_date: true,
          due_date: true,
          is_trashed: true,
        },
      }),
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          todo_app_user_id: props.member.id,
          is_trashed: false,
        },
      }),
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          todo_app_user_id: props.member.id,
          is_trashed: false,
          is_complete: true,
        },
      }),
      MyGlobal.prisma.todo_app_edit_history_entries.findMany({
        where: {
          edit: {
            todo: {
              todo_app_user_id: props.member.id,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 10,
        select: {
          id: true,
          created_at: true,
          previous_title: true,
          new_title: true,
          previous_description: true,
          new_description: true,
          previous_start_date: true,
          new_start_date: true,
          previous_due_date: true,
          new_due_date: true,
          todo_app_todo_edit_id: true,
        },
      }),
      MyGlobal.prisma.todo_app_users.findMany({
        where: {
          id: props.member.id,
        },
        select: {
          id: true,
          email: true,
        },
      }),
    ]);
  const user = users[0];
  const todoSummaries: ITodoAppTodo.ISummary[] = todos.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: todo.title,
    is_complete: todo.is_complete,
    created_at: toISOStringSafe(todo.created_at) as string &
      tags.Format<"date-time">,
    start_date: todo.start_date
      ? (toISOStringSafe(todo.start_date) as string & tags.Format<"date-time">)
      : null,
    due_date: todo.due_date
      ? (toISOStringSafe(todo.due_date) as string & tags.Format<"date-time">)
      : null,
    is_trashed: todo.is_trashed,
    user: {
      id: user.id as string & tags.Format<"uuid">,
      email: user.email,
    },
    edit_history_entries_count: 0 as number & tags.Type<"int32">,
  }));
  const recentEditHistory: ITodoAppEditHistoryEntry[] = editHistoryEntries.map(
    (entry) => ({
      id: entry.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(entry.created_at) as string &
        tags.Format<"date-time">,
      previous_title: entry.previous_title ?? null,
      new_title: entry.new_title ?? null,
      previous_description: entry.previous_description ?? null,
      new_description: entry.new_description ?? null,
      previous_start_date: entry.previous_start_date
        ? (toISOStringSafe(entry.previous_start_date) as string &
            tags.Format<"date-time">)
        : null,
      new_start_date: entry.new_start_date
        ? (toISOStringSafe(entry.new_start_date) as string &
            tags.Format<"date-time">)
        : null,
      previous_due_date: entry.previous_due_date
        ? (toISOStringSafe(entry.previous_due_date) as string &
            tags.Format<"date-time">)
        : null,
      new_due_date: entry.new_due_date
        ? (toISOStringSafe(entry.new_due_date) as string &
            tags.Format<"date-time">)
        : null,
      todo_app_todo_edit_id: entry.todo_app_todo_edit_id as string &
        tags.Format<"uuid">,
    }),
  );
  return {
    todos: todoSummaries,
    totalTodos: totalTodos as number & tags.Type<"int32">,
    completedTodos: completedTodos as number & tags.Type<"int32">,
    recentEditHistory: recentEditHistory,
  };
}
