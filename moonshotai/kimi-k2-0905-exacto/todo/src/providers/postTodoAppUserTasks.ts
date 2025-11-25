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

export async function postTodoAppUserTasks(props: {
  body: ITodoAppTask.ICreate;
}): Promise<ITodoAppTask> {
  // Since auth info is implied by authorizationActors, but not in props, we need
  // to understand how the framework handles user context.
  //
  // Looking at the operation spec again: authorizationActors: ["user"]
  // This suggests the endpoint is protected and user ID will be available in auth context
  // But the function signature doesn't include auth parameter!
  //
  // For now, implementing based on user_id from request body with fallback validation

  let userId: string;

  if (props.body.user_id) {
    // Validate the specified user exists
    const specifiedUser = await MyGlobal.prisma.todo_app_users.findUnique({
      where: { id: props.body.user_id },
    });

    if (!specifiedUser) {
      throw new HttpException("User not found", 404);
    }

    userId = props.body.user_id;
  } else {
    // This should come from auth context, but since it's not in the schema
    // we must require user_id in the request body for this operation
    throw new HttpException("User ID is required", 400);
  }

  const now = new Date();

  const task = await MyGlobal.prisma.todo_app_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: userId,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status,
      priority: props.body.priority ?? null,
      due_date: props.body.due_date ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      completed_at: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          created_at: true,
        },
      },
    },
  });

  const { user: userSummary, ...taskFields } = task;

  return {
    id: taskFields.id as string & tags.Format<"uuid">,
    title: taskFields.title,
    description:
      taskFields.description === null ? undefined : taskFields.description,
    status: taskFields.status,
    priority: taskFields.priority === null ? undefined : taskFields.priority,
    due_date: taskFields.due_date
      ? toISOStringSafe(taskFields.due_date)
      : undefined,
    user: {
      id: userSummary.id as string & tags.Format<"uuid">,
      email: userSummary.email,
      name: userSummary.name ?? undefined,
      status: userSummary.status,
      created_at: toISOStringSafe(userSummary.created_at),
    },
    created_at: toISOStringSafe(taskFields.created_at),
    updated_at: toISOStringSafe(taskFields.updated_at),
    deleted_at: taskFields.deleted_at
      ? toISOStringSafe(taskFields.deleted_at)
      : undefined,
    completed_at: taskFields.completed_at
      ? toISOStringSafe(taskFields.completed_at)
      : undefined,
  };
}
