import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTasksBulk(props: {
  user: UserPayload;
  body: ITodoAppTask.IBulkUpdate;
}): Promise<ITodoAppTask.IBulkUpdateResult> {
  const operations = props.body.operations;

  // Validate operation count
  if (operations.length === 0) {
    throw new HttpException("At least one operation is required", 400);
  }
  if (operations.length > 100) {
    throw new HttpException("Maximum 100 operations allowed", 400);
  }

  // Get all task IDs from operations
  const taskIds = operations.map((op) => op.id);

  // Verify all tasks exist and belong to the user
  const existingTasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    where: {
      id: { in: taskIds },
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    select: { id: true }, // Only need IDs for validation
  });

  const existingTaskIds = new Set(existingTasks.map((task) => task.id));
  const results: ITodoAppTask.IBulkOperationResult[] = [];
  let successfulOperations = 0;
  let failedOperations = 0;

  // Process operations within a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Process each operation
    for (const operation of operations) {
      try {
        // Check if task exists and belongs to user
        if (!existingTaskIds.has(operation.id)) {
          results.push({
            id: operation.id,
            success: false,
            error: "Task not found or does not belong to you",
          });
          failedOperations++;
          continue;
        }

        // Prepare update data
        const updateData: Prisma.todo_app_tasksUpdateInput = {};
        let hasUpdates = false;

        // Handle optional fields
        if (operation.title !== undefined) {
          updateData.title = operation.title;
          hasUpdates = true;
        }

        if (operation.description !== undefined) {
          updateData.description = operation.description;
          hasUpdates = true;
        }

        if (operation.status !== undefined) {
          updateData.status = operation.status;
          hasUpdates = true;

          // Set completed_at when status becomes completed
          if (operation.status === "completed") {
            updateData.completed_at = toISOStringSafe(new Date());
          } else if (operation.status === "pending") {
            updateData.completed_at = null;
          }
        }

        if (operation.priority !== undefined) {
          updateData.priority = operation.priority;
          hasUpdates = true;
        }

        if (operation.due_date !== undefined) {
          // Validate due_date is not too far in the future (max 5 years)
          if (operation.due_date !== null) {
            const dueDate = new Date(operation.due_date);
            const maxFuture = new Date();
            maxFuture.setFullYear(maxFuture.getFullYear() + 5);

            if (dueDate > maxFuture) {
              results.push({
                id: operation.id,
                success: false,
                error: "Due date cannot be more than 5 years in the future",
              });
              failedOperations++;
              continue;
            }
          }

          updateData.due_date = operation.due_date;
          hasUpdates = true;
        }

        // Update timestamp if any changes were made
        if (hasUpdates) {
          updateData.updated_at = toISOStringSafe(new Date());

          // Perform update
          await tx.todo_app_tasks.update({
            where: { id: operation.id },
            data: updateData,
          });

          results.push({
            id: operation.id,
            success: true,
            error: null,
          });
          successfulOperations++;
        } else {
          // No updates specified
          results.push({
            id: operation.id,
            success: true,
            error: null,
          });
          successfulOperations++;
        }
      } catch (error) {
        results.push({
          id: operation.id,
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        failedOperations++;
      }
    }
  });

  return {
    total_operations: operations.length,
    successful_operations: successfulOperations,
    failed_operations: failedOperations,
    results,
  };
}
