import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletion";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTasksBulkComplete(props: {
  user: UserPayload;
  body: ITodoAppTaskCompletion.ICreate;
}): Promise<ITodoAppTaskCompletion.ISummary> {
  const startTime = Date.now();
  const currentTime = toISOStringSafe(new Date());

  // Fetch all tasks and validate ownership
  const tasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    where: {
      id: { in: props.body.task_ids },
      todo_app_user_id: props.user.id,
    },
  });

  // Check if all requested tasks exist and belong to user
  if (tasks.length !== props.body.task_ids.length) {
    throw new HttpException(
      "Some tasks not found or don't belong to user",
      404,
    );
  }

  // Categorize tasks by status
  const completableTasks = tasks.filter(
    (task) => task.status === "pending" || task.status === "in-progress",
  );
  const alreadyCompletedTasks = tasks.filter(
    (task) => task.status === "completed",
  );

  const successfullyCompleted: string[] = [];
  const failedTaskIds: string[] = [];

  // Use transaction for atomic bulk operations
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      for (const task of completableTasks) {
        try {
          // Update task status to completed
          await tx.todo_app_tasks.update({
            where: { id: task.id },
            data: {
              status: "completed",
              updated_at: currentTime,
            },
          });

          // Create completion record
          const completionRecord = await tx.todo_app_task_completions.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              todo_app_task_id: task.id,
              todo_app_user_id: props.user.id,
              completed_at: currentTime,
              completion_order: task.completion_order,
              reactivated: false,
              created_at: currentTime,
            },
          });

          successfullyCompleted.push(task.id);
        } catch (error) {
          // Track failed tasks but continue processing
          failedTaskIds.push(task.id);
        }
      }
    });
  } catch (transactionError) {
    // If transaction fails completely, all tasks are considered failed
    throw new HttpException("Bulk completion operation failed", 500);
  }

  const processingTime = Date.now() - startTime;

  // Generate appropriate message based on results
  let message = "";
  if (failedTaskIds.length > 0) {
    message = `${successfullyCompleted.length} tasks completed successfully, ${failedTaskIds.length} failed to complete.`;
  } else if (alreadyCompletedTasks.length > 0) {
    message = `${successfullyCompleted.length} tasks completed successfully. ${alreadyCompletedTasks.length} tasks were already completed.`;
  } else {
    message = `Successfully completed ${successfullyCompleted.length} tasks.`;
  }

  return {
    total_requested: props.body.task_ids.length,
    successfully_completed: successfullyCompleted.length,
    failed_count: failedTaskIds.length,
    skipped_count: alreadyCompletedTasks.length,
    completion_percentage:
      (successfullyCompleted.length / props.body.task_ids.length) * 100,
    completed_task_ids: successfullyCompleted as (string &
      tags.Format<"uuid">)[],
    failed_task_ids: failedTaskIds as (string & tags.Format<"uuid">)[],
    message,
    processing_time_ms: processingTime,
    timestamp: currentTime,
  };
}
