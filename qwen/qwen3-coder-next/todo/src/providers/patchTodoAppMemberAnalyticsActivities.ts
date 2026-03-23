import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIScheduledTodoActivity";
import { IScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IScheduledTodoActivity";
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

export async function patchTodoAppMemberAnalyticsActivities(props: {
  member: MemberPayload;
  body: IScheduledTodoActivity.IRequest;
}): Promise<IPageIScheduledTodoActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const statusFilter =
    props.body.status === "all"
      ? undefined
      : props.body.status === "complete"
        ? true
        : false;
  // Get total counts for all activities
  const totalCreated = await MyGlobal.prisma.todo_app_todos.count({
    where: {
      todo_app_user_id: props.member.id,
      deleted_at: null,
      ...(statusFilter !== undefined && { is_complete: statusFilter }),
      ...(props.body.startDateRange && {
        created_at: { gte: props.body.startDateRange },
      }),
      ...(props.body.endDateRange && {
        created_at: { lt: props.body.endDateRange },
      }),
    },
  });
  const totalCompleted = await MyGlobal.prisma.todo_app_todos.count({
    where: {
      todo_app_user_id: props.member.id,
      deleted_at: null,
      is_complete: true,
      ...(props.body.startDateRange && {
        created_at: { gte: props.body.startDateRange },
      }),
      ...(props.body.endDateRange && {
        created_at: { lt: props.body.endDateRange },
      }),
    },
  });
  const totalEdited = await MyGlobal.prisma.todo_app_todo_edits.count({
    where: {
      todo: {
        todo_app_user_id: props.member.id,
        deleted_at: null,
      },
    },
  });
  // Get grouped data for creation
  const createdAtData = await MyGlobal.prisma.todo_app_todos.groupBy({
    by: ["created_at"],
    where: {
      todo_app_user_id: props.member.id,
      deleted_at: null,
      ...(statusFilter !== undefined && { is_complete: statusFilter }),
      ...(props.body.startDateRange && {
        created_at: { gte: props.body.startDateRange },
      }),
      ...(props.body.endDateRange && {
        created_at: { lt: props.body.endDateRange },
      }),
    },
    _count: { created_at: true },
    orderBy:
      props.body.sortField === "createdAt" && props.body.sortOrder === "asc"
        ? { created_at: "asc" }
        : props.body.sortField === "createdAt"
          ? { created_at: "desc" }
          : { created_at: "desc" },
    skip,
    take: limit,
  });
  // Get grouped data for completion
  const completedAtData = await MyGlobal.prisma.todo_app_todos.groupBy({
    by: ["created_at", "due_date"],
    where: {
      todo_app_user_id: props.member.id,
      deleted_at: null,
      is_complete: true,
      ...(props.body.startDateRange && {
        created_at: { gte: props.body.startDateRange },
      }),
      ...(props.body.endDateRange && {
        created_at: { lt: props.body.endDateRange },
      }),
    },
    _count: { created_at: true },
    orderBy:
      props.body.sortField === "dueAt" && props.body.sortOrder === "asc"
        ? { due_date: "asc" }
        : props.body.sortField === "dueAt"
          ? { due_date: "desc" }
          : { created_at: "desc" },
    skip,
    take: limit,
  });
  // Get grouped data for edits
  const editedAtData = await MyGlobal.prisma.todo_app_todo_edits.groupBy({
    by: ["edited_at"],
    where: {
      todo: {
        todo_app_user_id: props.member.id,
        deleted_at: null,
      },
    },
    _count: { edited_at: true },
    orderBy:
      props.body.sortField === "lastEditAt" && props.body.sortOrder === "asc"
        ? { edited_at: "asc" }
        : props.body.sortField === "lastEditAt"
          ? { edited_at: "desc" }
          : { edited_at: "desc" },
    skip,
    take: limit,
  });
  // Aggregate by date
  const activityMap = new Map<
    string,
    {
      created: number;
      completed: number;
      edited: number;
    }
  >();
  for (const row of createdAtData) {
    const dateStr = (row.created_at as Date).toISOString().split("T")[0];
    if (!activityMap.has(dateStr)) {
      activityMap.set(dateStr, { created: 0, completed: 0, edited: 0 });
    }
    const createdCount = row._count?.created_at;
    if (createdCount !== undefined) {
      activityMap.get(dateStr)!.created += createdCount;
    }
  }
  for (const row of completedAtData) {
    const dateStr = (row.created_at as Date).toISOString().split("T")[0];
    if (!activityMap.has(dateStr)) {
      activityMap.set(dateStr, { created: 0, completed: 0, edited: 0 });
    }
    const completedCount = row._count?.created_at;
    if (completedCount !== undefined) {
      activityMap.get(dateStr)!.completed += completedCount;
    }
  }
  for (const row of editedAtData) {
    const dateStr = (row.edited_at as Date).toISOString().split("T")[0];
    if (!activityMap.has(dateStr)) {
      activityMap.set(dateStr, { created: 0, completed: 0, edited: 0 });
    }
    const editedCount = row._count?.edited_at;
    if (editedCount !== undefined) {
      activityMap.get(dateStr)!.edited += editedCount;
    }
  }
  // Build activity summaries
  const activities: IScheduledTodoActivity.ISummary[] = [];
  for (const [timestamp, counts] of activityMap.entries()) {
    if (props.body.status === "all" || props.body.status === "created") {
      activities.push({
        activity_type: "created" as const,
        timestamp: timestamp + "T00:00:00.000Z",
        count: counts.created,
      } satisfies IScheduledTodoActivity.ISummary);
    }
    if (props.body.status === "all" || props.body.status === "complete") {
      activities.push({
        activity_type: "completed" as const,
        timestamp: timestamp + "T00:00:00.000Z",
        count: counts.completed,
      } satisfies IScheduledTodoActivity.ISummary);
    }
    if (props.body.status === "all" || props.body.status === "edited") {
      activities.push({
        activity_type: "edited" as const,
        timestamp: timestamp + "T00:00:00.000Z",
        count: counts.edited,
      } satisfies IScheduledTodoActivity.ISummary);
    }
  }
  // Sort activities
  activities.sort((a, b) => {
    if (props.body.sortField === "createdAt") {
      return props.body.sortOrder === "asc"
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp);
    } else if (props.body.sortField === "dueAt") {
      return props.body.sortOrder === "asc"
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp);
    } else {
      return props.body.sortOrder === "asc"
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp);
    }
  });
  const totalActivities = activities.length;
  const pages = Math.ceil(totalActivities / limit);
  return {
    data: activities.slice(skip, skip + limit),
    pagination: {
      current: page,
      limit: limit,
      records: totalActivities,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
