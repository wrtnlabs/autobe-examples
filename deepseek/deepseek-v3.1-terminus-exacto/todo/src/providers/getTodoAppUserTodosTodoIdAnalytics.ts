import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function getTodoAppUserTodosTodoIdAnalytics(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo.IAnalytic> {
  // 1. Verify todo exists and user owns it
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    select: {
      id: true,
      created_at: true,
    },
  });
  const todoCreatedAt = toISOStringSafe(todo.created_at);
  // 2. Fetch completion statistics using Prisma aggregates
  const totalCompletionCounts =
    await MyGlobal.prisma.todo_app_todo_completions.aggregate({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
      },
      _count: {
        _all: true,
      },
    });
  const totalCompletionEvents = totalCompletionCounts._count._all;
  // 单独查询true的完成数量
  const trueCompletionCounts =
    await MyGlobal.prisma.todo_app_todo_completions.aggregate({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
        completed: true,
      },
      _count: {
        _all: true,
      },
    });
  const totalTrueCompletions = trueCompletionCounts._count._all;
  // 3. Get last completion timestamp
  const lastCompletion =
    await MyGlobal.prisma.todo_app_todo_completions.findFirst({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
        completed: true,
      },
      orderBy: {
        created_at: "desc" as const,
      },
      select: {
        created_at: true,
      },
    });
  // 4. Calculate average completion frequency using database date math
  // Get timestamps of all true completions for calculation
  const completionTimestamps =
    await MyGlobal.prisma.todo_app_todo_completions.findMany({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
        completed: true,
      },
      orderBy: {
        created_at: "asc" as const,
      },
      select: {
        created_at: true,
      },
    });
  // Calculate time differences between consecutive completions
  let totalTimeDiffMinutes = 0;
  let timeDiffCount = 0;
  for (let i = 1; i < completionTimestamps.length; i++) {
    const timeDiffMs =
      completionTimestamps[i].created_at.getTime() -
      completionTimestamps[i - 1].created_at.getTime();
    totalTimeDiffMinutes += timeDiffMs / (1000 * 60);
    timeDiffCount++;
  }
  const avgCompletionFrequencyMinutes =
    timeDiffCount > 0 ? Math.round(totalTimeDiffMinutes / timeDiffCount) : 0;
  // 5. Fetch edit history metrics
  const historyCount = await MyGlobal.prisma.todo_app_todo_histories.aggregate({
    where: {
      todo_app_todo_id: props.todoId,
      deleted_at: null,
    },
    _count: {
      _all: true,
    },
    _max: {
      created_at: true,
    },
  });
  // 6. Fetch field change counts
  const fieldChanges =
    await MyGlobal.prisma.todo_app_todo_history_changes.groupBy({
      by: ["field_name"],
      where: {
        history: {
          todo_app_todo_id: props.todoId,
          deleted_at: null,
        },
      },
      _count: {
        field_name: true,
      },
    });
  // Process field change counts
  const fieldCounts = {
    title_changes: 0,
    description_changes: 0,
    start_date_changes: 0,
    due_date_changes: 0,
  };
  fieldChanges.forEach((change) => {
    if (change.field_name === "title")
      fieldCounts.title_changes = change._count.field_name;
    if (change.field_name === "description")
      fieldCounts.description_changes = change._count.field_name;
    if (change.field_name === "start_date")
      fieldCounts.start_date_changes = change._count.field_name;
    if (change.field_name === "due_date")
      fieldCounts.due_date_changes = change._count.field_name;
  });
  // 7. Calculate completion rate safely
  const completionRate =
    totalCompletionEvents > 0
      ? totalTrueCompletions / totalCompletionEvents
      : 0;
  // 8. Calculate time since creation in minutes
  const createdAtTime = todo.created_at.getTime();
  const nowTime = Date.now();
  const timeSinceCreationMinutes = Math.floor(
    (nowTime - createdAtTime) / (1000 * 60),
  );
  // 9. Build final analytics object
  return {
    completion_statistics: {
      total_completions: totalTrueCompletions satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      completion_rate: completionRate satisfies number &
        tags.Minimum<0> &
        tags.Maximum<1>,
      average_completion_time_minutes:
        avgCompletionFrequencyMinutes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      last_completion_at: lastCompletion?.created_at
        ? toISOStringSafe(lastCompletion.created_at)
        : null,
    },
    edit_history_metrics: {
      total_edits: historyCount._count._all satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      recent_edit_at: historyCount._max.created_at
        ? toISOStringSafe(historyCount._max.created_at)
        : null,
      field_change_counts: {
        title_changes: fieldCounts.title_changes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        description_changes: fieldCounts.description_changes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        start_date_changes: fieldCounts.start_date_changes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        due_date_changes: fieldCounts.due_date_changes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies ITodoAppTodo.IAnalytic["edit_history_metrics"]["field_change_counts"],
    } satisfies ITodoAppTodo.IAnalytic["edit_history_metrics"],
    timing_insights: {
      created_at: todoCreatedAt satisfies string & tags.Format<"date-time">,
      time_since_creation_minutes: timeSinceCreationMinutes satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      completion_frequency_minutes:
        avgCompletionFrequencyMinutes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
    } satisfies ITodoAppTodo.IAnalytic["timing_insights"],
  } satisfies ITodoAppTodo.IAnalytic;
}
