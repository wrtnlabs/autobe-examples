import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppTaskCompletionByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskCompletionByDay";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTaskCompletionByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionByDay";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminStatisticsTaskCompletionByDay(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppTaskCompletionByDay.ISummary> {
  const { admin } = props;

  // Authorization: ensure admin exists and is active
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (
    !adminRecord ||
    adminRecord.deleted_at !== null ||
    adminRecord.is_active !== true
  ) {
    throw new HttpException("Unauthorized: admin not active or not found", 403);
  }

  try {
    // Fetch tasks with minimal fields and parent list's deleted_at to filter out inactive lists
    const tasks = await MyGlobal.prisma.todo_app_tasks.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        created_at: true,
        completed_at: true,
        is_completed: true,
        todo_app_list_id: true,
        list: { select: { deleted_at: true } },
      },
    });

    const createdCounts = new Map<string, number>();
    const completedCounts = new Map<string, number>();

    for (const t of tasks) {
      // Exclude tasks whose parent list is soft-deleted
      if (t.list && t.list.deleted_at !== null) continue;

      const createdIso = toISOStringSafe(t.created_at);
      const createdDay = createdIso.slice(0, 10); // YYYY-MM-DD UTC
      createdCounts.set(createdDay, (createdCounts.get(createdDay) ?? 0) + 1);

      if (t.completed_at) {
        const completedIso = toISOStringSafe(t.completed_at);
        const completedDay = completedIso.slice(0, 10);
        completedCounts.set(
          completedDay,
          (completedCounts.get(completedDay) ?? 0) + 1,
        );
      }
    }

    const allDates = Array.from(
      new Set([...createdCounts.keys(), ...completedCounts.keys()]),
    );
    allDates.sort();

    const data = allDates.map((date) => ({
      date,
      completedCount: Number(completedCounts.get(date) ?? 0),
    }));

    const pagination = {
      current: Number(1),
      limit: Number(data.length),
      records: Number(data.length),
      pages: Number(1),
    };

    return {
      pagination,
      data,
    };
  } catch (_err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
