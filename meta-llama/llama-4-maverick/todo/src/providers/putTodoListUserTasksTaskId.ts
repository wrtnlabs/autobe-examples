import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { UserPayload } from "../decorators/payload/UserPayload";

```typescript
export async function putTodoListUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<'uuid'>;
  body: ITodoListTask.IUpdate;
}): Promise<ITodoListTask> {
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.taskId },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  if (task.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updateData: Prisma.todo_list_tasksUpdateInput = {
    ...(props.body.completed !== undefined && {
      completed: props.body.completed,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.dueDate !== undefined && {
      dueDate: props.body.dueDate ? new Date(props.body.dueDate) : null,
    }),
    ...(props.body.title !== undefined && { title: props.body.title }),
    updated_at: new Date(),
  };

  const updatedTask = await MyGlobal.prisma.todo_list_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });

  return {
    id: updatedTask.id,
    title: updatedTask.title,
    completed: updatedTask.completed,
    description: updatedTask.description,
    dueDate: props.body.dueDate ? toISOStringSafe(new Date(props.body.dueDate)) : null,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
  } satisfies ITodoListTask;
}
```;
