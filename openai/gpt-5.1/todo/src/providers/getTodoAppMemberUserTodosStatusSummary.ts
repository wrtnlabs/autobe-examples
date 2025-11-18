import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatusSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatusSummary";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getTodoAppMemberUserTodosStatusSummary(props: {
  memberUser: MemberuserPayload;
}): Promise<ITodoAppTodoStatusSummary> {
  const memberUserId = props.memberUser.id;

  // Define business status values
  const pendingStatus = "pending";
  const completedStatus = "completed";

  // Compute a recent completion window boundary (e.g., last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = toISOStringSafe(sevenDaysAgo);

  const [totalCount, pendingCount, completedCount, recentlyCompletedCount] =
    await Promise.all([
      // Total non-deleted todos for this member user
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          todo_app_memberuser_id: memberUserId,
          deleted_at: null,
        },
      }),
      // Pending todos
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          todo_app_memberuser_id: memberUserId,
          deleted_at: null,
          status: pendingStatus,
        },
      }),
      // Completed todos
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          todo_app_memberuser_id: memberUserId,
          deleted_at: null,
          status: completedStatus,
        },
      }),
      // Recently completed todos within the last 7 days
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          todo_app_memberuser_id: memberUserId,
          deleted_at: null,
          status: completedStatus,
          completed_at: {
            gte: sevenDaysAgoIso,
          },
        },
      }),
    ]);

  return {
    total_count: totalCount,
    pending_count: pendingCount,
    completed_count: completedCount,
    recently_completed_count: recentlyCompletedCount,
  };
}
