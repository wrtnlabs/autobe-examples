import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemStatistics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAdminsStatistics(props: {
  admin: AdminPayload;
}): Promise<ITodoListSystemStatistics> {
  const { admin } = props;

  // Calculate 30 days ago using toISOStringSafe (allowed pattern)
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoMs = nowMs - thirtyDaysMs;
  const thirtyDaysAgo = toISOStringSafe(new Date(thirtyDaysAgoMs));

  // Execute all queries in parallel
  const [
    totalUsers,
    activeUserSessions,
    totalTodos,
    activeTodos,
    completedTodos,
  ] = await Promise.all([
    MyGlobal.prisma.todo_list_users.count({
      where: {
        deleted_at: null,
      },
    }),

    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        todo_list_user_id: true,
      },
      distinct: ["todo_list_user_id"],
    }),

    MyGlobal.prisma.todo_list_todos.count({
      where: {
        deleted_at: null,
      },
    }),

    MyGlobal.prisma.todo_list_todos.count({
      where: {
        deleted_at: null,
        status: "incomplete",
      },
    }),

    MyGlobal.prisma.todo_list_todos.count({
      where: {
        deleted_at: null,
        status: "complete",
      },
    }),
  ]);

  const activeUsers = activeUserSessions.length;
  const completionRate =
    totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
  const averageTodosPerUser = totalUsers > 0 ? totalTodos / totalUsers : 0;

  return {
    total_users: Number(totalUsers),
    active_users: Number(activeUsers),
    total_todos: Number(totalTodos),
    active_todos: Number(activeTodos),
    completed_todos: Number(completedTodos),
    completion_rate: completionRate,
    average_todos_per_user: averageTodosPerUser,
  };
}
