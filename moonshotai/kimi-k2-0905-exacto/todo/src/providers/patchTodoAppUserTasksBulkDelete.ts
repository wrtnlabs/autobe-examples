import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDeletion";
import { ITodoAppTaskId } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskId";
import { IError } from "@ORGANIZATION/PROJECT-api/lib/structures/IError";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTasksBulkDelete(props: {
  user: UserPayload;
  body: ITodoAppTaskDeletion.ICreate;
}): Promise<ITodoAppTaskDeletion.ISummary> {
  const taskIds = props.body.task_ids.map((task) => task.id);

  // First, check ownership and existence of all tasks
  const existingTasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    where: {
      id: {
        in: taskIds,
      },
    },
    select: {
      id: true,
      todo_app_user_id: true,
    },
  });

  // Build error summary
  const errors: IError.ISummary[] = [];
  const validTaskIds: string[] = [];

  // Check each task for issues
  for (const taskId of taskIds) {
    const task = existingTasks.find((t) => t.id === taskId);

    if (!task) {
      errors.push({
        code: "TASK_NOT_FOUND",
        message: "Task not found",
        task_id: taskId,
      });
    } else if (task.todo_app_user_id !== props.user.id) {
      errors.push({
        code: "UNAUTHORIZED",
        message: "Task does not belong to authenticated user",
        task_id: taskId,
      });
    } else {
      validTaskIds.push(taskId);
    }
  }

  // If there are any errors, return with 0 deletions (atomic operation)
  if (errors.length > 0) {
    return {
      deleted_count: 0,
      total_requested: taskIds.length satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      errors,
    };
  }

  // Perform bulk deletion atomically
  const result = await MyGlobal.prisma.todo_app_tasks.deleteMany({
    where: {
      id: {
        in: validTaskIds,
      },
    },
  });

  return {
    deleted_count: result.count satisfies number as number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    total_requested: taskIds.length satisfies number as number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    errors: [],
  };
}
