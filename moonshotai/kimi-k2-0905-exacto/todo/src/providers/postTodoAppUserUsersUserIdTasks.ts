import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserUsersUserIdTasks(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppTask.ICreate;
}): Promise<ITodoAppTask> {
  // Authorization check - user can only create tasks for themselves
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "You can only create tasks for your own user ID",
      403,
    );
  }

  // Validate due date if provided - should not be in the past for pending tasks
  if (props.body.due_date) {
    const dueDate = new Date(props.body.due_date);
    const now = new Date();
    // Remove time component for date-only comparison
    dueDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    if (dueDate < now) {
      throw new HttpException("Due date cannot be in the past", 400);
    }
  }

  // Validate status
  if (props.body.status !== "pending" && props.body.status !== "completed") {
    throw new HttpException(
      "Status must be either 'pending' or 'completed'",
      400,
    );
  }

  // Get user information for the response
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Create the task
  const task = await MyGlobal.prisma.todo_app_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: props.userId,
      title: props.body.title,
      description: props.body.description,
      status: props.body.status,
      priority: props.body.priority,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      completed_at: props.body.status === "completed" ? new Date() : null,
    },
  });

  // Return the complete task with user summary
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    deleted_at: null,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      created_at: toISOStringSafe(user.created_at),
    },
  };
}
