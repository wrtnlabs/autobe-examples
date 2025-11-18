import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTasksBulk(props: {
  user: UserPayload;
  body: ITodoAppTask.IBulkRequest;
}): Promise<ITodoAppTask.IBulkResponse> {
  // Load all requested tasks with user information in single query
  const originalTasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    where: {
      id: { in: props.body.task_ids },
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    include: {
      // Remove todo_app_user include - not valid in this Prisma model
    },
  });

  // Check if all tasks exist and belong to user
  if (originalTasks.length !== props.body.task_ids.length) {
    throw new HttpException(
      "Some tasks do not exist or do not belong to the authenticated user",
      404,
    );
  }

  // Filter by status if requested, but keep track for non-matching tasks
  let tasksToProcess = originalTasks;
  const skippedTasks = new Set<string>();

  if (props.body.filter_status && props.body.filter_status !== "all") {
    tasksToProcess = originalTasks.filter((task) => {
      const matchesFilter = task.status === props.body.filter_status;
      if (!matchesFilter) {
        skippedTasks.add(task.id);
      }
      return matchesFilter;
    });
  }

  const results: ITodoAppTask.IBulkResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let warningCount = 0;
  const processedTasks = new Map<string, (typeof originalTasks)[0]>();

  // Process each task based on action type
  for (const task of originalTasks) {
    // Handle filtered tasks
    if (skippedTasks.has(task.id)) {
      results.push({
        task_id: task.id,
        status: "warning",
        error_message: `Task filtered out by status filter: ${props.body.filter_status}`,
        task: formatTaskResponse(task),
        operation_type: props.body.action,
      });
      warningCount++;
      continue;
    }

    try {
      let updateData: Record<string, unknown> = {};
      let warningMessage: string | null = null;
      let isSuccess = false;

      switch (props.body.action) {
        case "complete":
          if (task.status === "completed") {
            warningMessage = "Task was already completed";
          } else {
            updateData = {
              status: "completed",
              completed_at: new Date(),
            };
            isSuccess = true;
          }
          break;

        case "restore":
          if (task.status === "pending") {
            warningMessage = "Task was already pending";
          } else {
            updateData = {
              status: "pending",
              completed_at: null,
            };
            isSuccess = true;
          }
          break;

        case "update_priority":
          if (
            !props.body.parameters ||
            !("priority" in props.body.parameters)
          ) {
            throw new HttpException(
              "Priority parameter is required for update_priority action",
              400,
            );
          }
          updateData = {
            priority: props.body.parameters.priority,
          };
          isSuccess = true;
          break;

        case "update_due_date":
          if (
            !props.body.parameters ||
            !("due_date" in props.body.parameters)
          ) {
            throw new HttpException(
              "Due date parameter is required for update_due_date action",
              400,
            );
          }
          updateData = {
            due_date: props.body.parameters.due_date,
          };
          isSuccess = true;
          break;

        case "archive":
          if (task.deleted_at !== null) {
            warningMessage = "Task was already archived";
          } else {
            updateData = {
              deleted_at: new Date(),
            };
            isSuccess = true;
          }
          break;

        default:
          throw new HttpException(
            `Unknown bulk action: ${props.body.action}`,
            400,
          );
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date();
        const updated = await MyGlobal.prisma.todo_app_tasks.update({
          where: { id: task.id },
          data: updateData,
        });
        processedTasks.set(task.id, { ...task, ...updated });
        if (isSuccess) successCount++;
      } else {
        processedTasks.set(task.id, task);
        if (warningMessage) warningCount++;
      }

      results.push({
        task_id: task.id,
        status: warningMessage ? "warning" : "success",
        error_message: warningMessage,
        task: formatTaskResponse(processedTasks.get(task.id)!),
        operation_type: props.body.action,
      });
    } catch (error) {
      failureCount++;
      results.push({
        task_id: task.id,
        status: "failure",
        error_message:
          error instanceof Error ? error.message : "Unknown error occurred",
        task: formatTaskResponse(task),
        operation_type: props.body.action,
      });
    }
  }

  return {
    success_count: successCount,
    failure_count: failureCount,
    warning_count: warningCount,
    total_count: originalTasks.length,
    results,
    has_errors: failureCount > 0,
  };
}

/** Helper function to format task response with proper type safety */
function formatTaskResponse(task: any): ITodoAppTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date
      ? toISOStringSafe(new Date(task.due_date))
      : task.due_date,
    created_at: toISOStringSafe(new Date(task.created_at)),
    updated_at: toISOStringSafe(new Date(task.updated_at)),
    deleted_at: task.deleted_at
      ? toISOStringSafe(new Date(task.deleted_at))
      : task.deleted_at,
    completed_at: task.completed_at
      ? toISOStringSafe(new Date(task.completed_at))
      : task.completed_at,
    user: {
      id: task.todo_app_user_id,
      email: task.todo_app_user?.email || "",
      name: task.todo_app_user?.name,
      status: task.todo_app_user?.status || "active",
      created_at: toISOStringSafe(
        new Date(task.todo_app_user?.created_at || task.created_at),
      ),
    },
  };
}
