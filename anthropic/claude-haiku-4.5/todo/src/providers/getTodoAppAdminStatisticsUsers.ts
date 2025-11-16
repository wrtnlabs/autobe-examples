import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";
import { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminStatisticsUsers(props: {
  admin: AdminPayload;
}): Promise<ITodoAppUserStatistics> {
  const now = new Date();
  const now_24h_ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const now_7d_ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const now_30d_ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const today_start = new Date(now);
  today_start.setUTCHours(0, 0, 0, 0);

  const this_week_start = new Date(now);
  const day_of_week = this_week_start.getUTCDay();
  const diff =
    this_week_start.getUTCDate() - day_of_week + (day_of_week === 0 ? -6 : 1);
  this_week_start.setUTCDate(diff);
  this_week_start.setUTCHours(0, 0, 0, 0);

  const this_month_start = new Date(now);
  this_month_start.setUTCDate(1);
  this_month_start.setUTCHours(0, 0, 0, 0);

  const first_week_ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    total_users,
    active_users_7d,
    active_users_30d,
    active_users_today,
    active_users_this_week,
    active_users_this_month,
    new_users_24h,
    new_users_7d,
    new_users_30d,
    deleted_users_30d,
    all_sessions,
    registration_data,
    users_30d_old,
    retained_users,
  ] = await Promise.all([
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, last_active_at: { gte: now_7d_ago } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, last_active_at: { gte: now_30d_ago } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, last_active_at: { gte: today_start } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, last_active_at: { gte: this_week_start } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, last_active_at: { gte: this_month_start } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, created_at: { gte: now_24h_ago } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, created_at: { gte: now_7d_ago } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, created_at: { gte: now_30d_ago } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        AND: [
          { deleted_at: { not: null } },
          { deleted_at: { gte: now_30d_ago } },
        ],
      },
    }),
    MyGlobal.prisma.todo_app_user_session.findMany({
      select: { created_at: true, expired_at: true },
    }),
    MyGlobal.prisma.todo_app_user.findMany({
      where: { deleted_at: null, created_at: { gte: now_30d_ago } },
      select: { created_at: true },
      orderBy: { created_at: "asc" },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null, created_at: { lte: first_week_ago } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        deleted_at: null,
        created_at: { lte: first_week_ago },
        last_active_at: { gte: first_week_ago },
      },
    }),
  ]);

  const trend_map = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const date = new Date(now_30d_ago);
    date.setUTCDate(date.getUTCDate() + i);
    const date_str = date.toISOString().split("T")[0];
    trend_map.set(date_str, 0);
  }
  for (const user of registration_data) {
    const date_str = user.created_at.toISOString().split("T")[0];
    if (trend_map.has(date_str)) {
      trend_map.set(date_str, (trend_map.get(date_str) ?? 0) + 1);
    }
  }

  const registration_trend: IRegistrationTrendDay[] = Array.from(
    trend_map.entries(),
  )
    .map(([date, count]) => ({
      date: date as string & tags.Format<"date">,
      count: count as number & tags.Type<"int32">,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const retention_percent =
    users_30d_old > 0 ? (retained_users / users_30d_old) * 100 : 0;

  let avg_session_duration = 0;
  if (all_sessions.length > 0) {
    const total_duration = all_sessions.reduce((sum, session) => {
      const end = session.expired_at ?? now;
      const duration =
        (end.getTime() - session.created_at.getTime()) / (1000 * 60);
      return sum + Math.max(0, duration);
    }, 0);
    avg_session_duration = total_duration / all_sessions.length;
  }

  const active_user_ids = await MyGlobal.prisma.todo_app_user.findMany({
    where: { deleted_at: null, last_active_at: { gte: now_30d_ago } },
    select: { id: true },
  });

  let avg_todos = 0;
  let avg_todos_completed = 0;
  if (active_user_ids.length > 0) {
    const user_ids = active_user_ids.map((u) => u.id);
    const todo_stats = await MyGlobal.prisma.todo_app_todo.groupBy({
      by: ["todo_app_user_id"],
      _count: { id: true },
      where: { todo_app_user_id: { in: user_ids } },
    });

    const completed_stats = await MyGlobal.prisma.todo_app_todo.groupBy({
      by: ["todo_app_user_id"],
      _count: { id: true },
      where: { todo_app_user_id: { in: user_ids }, is_completed: true },
    });

    const total_todos = todo_stats.reduce(
      (sum, ts) => sum + (ts._count.id ?? 0),
      0,
    );
    const total_completed = completed_stats.reduce(
      (sum, ts) => sum + (ts._count.id ?? 0),
      0,
    );
    avg_todos = total_todos / active_user_ids.length;
    avg_todos_completed = total_completed / active_user_ids.length;
  }

  const sessions_by_hour = new Map<number, number>();
  const sessions_by_day = new Map<string, number>();
  const days_map = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const session of all_sessions) {
    const hour = session.created_at.getUTCHours();
    const day_idx = session.created_at.getUTCDay();
    sessions_by_hour.set(hour, (sessions_by_hour.get(hour) ?? 0) + 1);
    sessions_by_day.set(
      days_map[day_idx],
      (sessions_by_day.get(days_map[day_idx]) ?? 0) + 1,
    );
  }

  let peak_hour = "0";
  let peak_hour_count = 0;
  for (const [hour, count] of sessions_by_hour.entries()) {
    if (count > peak_hour_count) {
      peak_hour_count = count;
      peak_hour = hour.toString();
    }
  }

  let peak_day = "Monday";
  let peak_day_count = 0;
  for (const [day, count] of sessions_by_day.entries()) {
    if (count > peak_day_count) {
      peak_day_count = count;
      peak_day = day;
    }
  }

  const concurrent_peak = all_sessions.filter(
    (s) => s.expired_at === null,
  ).length;

  return {
    total_users: total_users as number & tags.Type<"int32">,
    active_users_7d: active_users_7d as number & tags.Type<"int32">,
    active_users_30d: active_users_30d as number & tags.Type<"int32">,
    active_users_today: active_users_today as number & tags.Type<"int32">,
    new_users_24h: new_users_24h as number & tags.Type<"int32">,
    new_users_7d: new_users_7d as number & tags.Type<"int32">,
    new_users_30d: new_users_30d as number & tags.Type<"int32">,
    registration_trend,
    active_users_this_week: active_users_this_week as number &
      tags.Type<"int32">,
    active_users_this_month: active_users_this_month as number &
      tags.Type<"int32">,
    average_session_duration_minutes: avg_session_duration,
    user_retention_week_percent: retention_percent,
    avg_todos_per_active_user: avg_todos,
    avg_todos_completed_per_active_user: avg_todos_completed,
    peak_usage_hour: peak_hour,
    peak_usage_day: peak_day,
    users_deleted_30d: deleted_users_30d as number & tags.Type<"int32">,
    concurrent_users_peak: concurrent_peak as number & tags.Type<"int32">,
  };
}
