import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";

// CONTRADICTION DETECTED: Operation specification requires todoUser authentication
// but the function signature only provides taskId without user authentication.
// According to the operation description: "ensures users can only access their own tasks
// through ownership verification by matching the authenticated user from their session
// with the todo_user_id foreign key in the task record."
//
// This is a fundamental mismatch between the authorization requirement and the actual
// function signature. The function cannot implement the required security filtering
// without access to the authenticated user context.
//
// @todo Update function signature to include UserPayload or use session-based
// authentication to enable proper ownership verification
export async function getTodoUserTodoTasksTaskId(props: {
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoTask.ISecure> {
  // Cannot implement proper ownership verification without user authentication
  // Current implementation provides all task details but lacks security filtering
  const task = await MyGlobal.prisma.todo_tasks.findUnique({
    where: { id: props.taskId },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Without user authentication, we cannot verify ownership
  // This violates the security requirement but maintains type compliance
  return {
    id: task.id as string & tags.Format<"uuid">,
    todo_user_id: task.todo_user_id as string & tags.Format<"uuid">,
    description: task.description,
    completed: task.completed,
    business_status: task.business_status,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
  };
}
