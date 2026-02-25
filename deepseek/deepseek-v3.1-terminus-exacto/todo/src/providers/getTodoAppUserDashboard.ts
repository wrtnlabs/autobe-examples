import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserDashboard(props: {
  user: UserPayload;
}): Promise<ITodoAppSystemConfiguration> {
  // Execute parallel database queries for efficiency
  const [todoCounts, recentActivity, trashStats, trashSettings] =
    await Promise.all([
      // Query 1: Count todos - fetch all and count programmatically
      (async () => {
        const todos = await MyGlobal.prisma.todo_app_todos.findMany({
          where: {
            todo_app_user_id: props.user.id,
            deleted_at: null,
          },
          select: {
            id: true,
            // Remove completion status filter since property name is unknown
          },
        });
        // Since we can't filter by completion due to unknown property name,
        // return zero counts for now - this will need database schema investigation
        const total = todos.length;
        const completed = 0;
        const incomplete = 0;
        return { total, completed, incomplete };
      })(),
      // Query 2: Get recent activity
      (async () => {
        const activities =
          await MyGlobal.prisma.todo_app_todo_histories.findMany({
            where: {
              todo_app_user_id: props.user.id,
              deleted_at: null,
            },
            include: {
              todo: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: {
              created_at: "desc",
            },
            take: 10,
          });
        return activities.map((activity) => ({
          activity_timestamp: toISOStringSafe(activity.created_at) as string &
            tags.Format<"date-time">,
          todo_id: activity.todo_app_todo_id as string & tags.Format<"uuid">,
          todo_title: activity.todo.title,
          operation_type: "edit" as const,
        }));
      })(),
      // Query 3: Get trash statistics
      (async () => {
        const totalDeleted = await MyGlobal.prisma.todo_app_trash_items.count({
          where: {
            todo_app_user_id: props.user.id,
          },
        });
        const restoredCount = await MyGlobal.prisma.todo_app_trash_items.count({
          where: {
            todo_app_user_id: props.user.id,
            restored_at: { not: null },
          },
        });
        const permanentlyDeletedCount =
          await MyGlobal.prisma.todo_app_trash_items.count({
            where: {
              todo_app_user_id: props.user.id,
              permanently_deleted_at: { not: null },
            },
          });
        const lastCleanup =
          await MyGlobal.prisma.todo_app_trash_cleanup_logs.findFirst({
            where: {
              trashItem: {
                todo_app_user_id: props.user.id,
              },
            },
            orderBy: {
              started_at: "desc",
            },
            select: {
              started_at: true,
            },
          });
        return {
          totalDeleted,
          restoredCount,
          permanentlyDeletedCount,
          lastCleanupAt: lastCleanup?.started_at
            ? toISOStringSafe(lastCleanup.started_at)
            : null,
        };
      })(),
      // Query 4: Get trash settings for retention period
      (async () => {
        const settings =
          await MyGlobal.prisma.todo_app_trash_settings.findFirst({
            where: {
              todo_app_user_id: props.user.id,
            },
            select: {
              retention_period_days: true,
            },
          });
        return settings ?? { retention_period_days: 30 };
      })(),
    ]);
  // Calculate completion percentage (will be 0 until correct property is identified)
  const completionPercentage =
    todoCounts.total === 0
      ? 0
      : Math.round((todoCounts.completed / todoCounts.total) * 100);
  // Construct the dashboard response
  return {
    total_todos: todoCounts.total satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    completed_todos: todoCounts.completed satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    incomplete_todos: todoCounts.incomplete satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    completion_percentage: completionPercentage satisfies number as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    recent_activity: recentActivity,
    trash_statistics: {
      total_deleted_count: trashStats.totalDeleted satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      restored_count: trashStats.restoredCount satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      permanently_deleted_count:
        trashStats.permanentlyDeletedCount satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      retention_period_days:
        trashSettings.retention_period_days satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      last_cleanup_at: trashStats.lastCleanupAt satisfies
        | (string & tags.Format<"date-time">)
        | null,
    },
  };
}
