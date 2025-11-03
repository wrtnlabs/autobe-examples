import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserUserTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoTask.IUpdate;
}): Promise<ITodoTask> {
  // Build update data respecting ITodoTask.IUpdate partial update semantics
  const updateData = {
    ...(props.body.description !== undefined &&
      props.body.description !== null && {
        description: props.body.description satisfies string as string,
      }),
    ...(props.body.completed !== undefined && {
      completed:
        props.body.completed !== null
          ? (props.body.completed satisfies boolean as boolean)
          : undefined,
    }),
    ...(props.body.business_status !== undefined && {
      business_status:
        props.body.business_status !== null
          ? (props.body.business_status satisfies string as string)
          : undefined,
    }),
    // Handle completed_at based on completed status change
    ...(props.body.completed !== undefined && {
      completed_at:
        props.body.completed === true
          ? toISOStringSafe(new Date())
          : props.body.completed === false
            ? null
            : undefined,
    }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.todo_tasksUpdateInput;

  // Perform update with authorization check in WHERE clause
  const updatedTask = await MyGlobal.prisma.todo_tasks
    .update({
      where: {
        id: props.id satisfies string as string,
        todo_user_id: props.user.id satisfies string as string, // Authorization: only update user's own tasks
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mfa_enabled: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            _count: {
              select: { todo_tasks: true },
            },
          },
        },
      },
    })
    .catch((error) => {
      // Handle Prisma "not found" error
      if (error.code === "P2025") {
        // Record to update not found
        throw new HttpException("Task not found or unauthorized", 404);
      }

      // Handle unique constraint violation on (description, todo_user_id)
      if (
        error.code === "P2002" &&
        error.meta?.target?.includes("todo_tasks_description_todo_user_id_key")
      ) {
        throw new HttpException(
          "Task with this description already exists",
          409,
        );
      }

      throw error;
    });

  // Map Prisma result to ITodoTask format
  return {
    id: updatedTask.id as string & tags.Format<"uuid">,
    description: updatedTask.description,
    completed: updatedTask.completed,
    business_status: updatedTask.business_status,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
    completed_at: updatedTask.completed_at
      ? toISOStringSafe(updatedTask.completed_at)
      : null,
    user: {
      id: updatedTask.user.id as string & tags.Format<"uuid">,
      email: updatedTask.user.email as string & tags.Format<"email">,
      mfa_enabled: updatedTask.user.mfa_enabled,
      tasks_count: updatedTask.user._count.todo_tasks as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      created_at: toISOStringSafe(updatedTask.user.created_at),
      updated_at: toISOStringSafe(updatedTask.user.updated_at),
      deleted_at: updatedTask.user.deleted_at
        ? toISOStringSafe(updatedTask.user.deleted_at)
        : null,
    },
  } satisfies ITodoTask;
}
