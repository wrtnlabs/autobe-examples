import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // 1. Verify todo exists and belongs to user
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_user_id: true,
      deleted_at: true,
    },
  });
  // 2. Ownership validation
  if (todo.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Ensure todo is not soft-deleted
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }
  // 4. Prepare update data for main table
  const mainUpdateData = {
    updated_at: new Date(),
    ...(props.body.title !== undefined && { title: props.body.title }),
  } satisfies Prisma.todo_app_todosUpdateInput;
  // 5. Execute transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update main todo table
    await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: mainUpdateData,
    });
    // Update description if provided
    if (props.body.description !== undefined) {
      if (props.body.description === null) {
        // Remove description
        await tx.todo_app_todo_description_fields.deleteMany({
          where: { todo_app_todo_id: props.todoId },
        });
      } else {
        // Upsert description
        await tx.todo_app_todo_description_fields.upsert({
          where: { todo_app_todo_id: props.todoId },
          update: {
            description: props.body.description,
            updated_at: new Date(),
          },
          create: {
            id: v4(),
            description: props.body.description,
            todo_app_todo_id: props.todoId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
    // Update start date if provided
    if (props.body.start_date !== undefined) {
      if (props.body.start_date === null) {
        // Remove start date
        await tx.todo_app_todo_start_date_fields.deleteMany({
          where: { todo_app_todo_id: props.todoId },
        });
      } else {
        // Parse ISO string to Date
        const startDate = new Date(props.body.start_date);
        await tx.todo_app_todo_start_date_fields.upsert({
          where: { todo_app_todo_id: props.todoId },
          update: {
            start_date: startDate,
            updated_at: new Date(),
          },
          create: {
            id: v4(),
            start_date: startDate,
            todo_app_todo_id: props.todoId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
    // Update due date if provided
    if (props.body.due_date !== undefined) {
      if (props.body.due_date === null) {
        // Remove due date
        await tx.todo_app_todo_due_date_fields.deleteMany({
          where: { todo_app_todo_id: props.todoId },
        });
      } else {
        // Parse ISO string to Date
        const dueDate = new Date(props.body.due_date);
        await tx.todo_app_todo_due_date_fields.upsert({
          where: { todo_app_todo_id: props.todoId },
          update: {
            due_date: dueDate,
          },
          create: {
            id: v4(),
            due_date: dueDate,
            todo_app_todo_id: props.todoId,
          },
        });
      }
    }
    // Return the updated todo with all relations
    return tx.todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...TodoAppTodoTransformer.select(),
    });
  });
  // 6. Transform and return
  return TodoAppTodoTransformer.transform(updated);
}
