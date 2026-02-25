import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserBulkRestore(props: {
  user: UserPayload;
  body: ITodoAppTodo.IBulkRestoreRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const currentTime = new Date().toISOString();
  // Validate that all todo IDs belong to current user and exist in trash
  const trashItems = await MyGlobal.prisma.todo_app_trash_items.findMany({
    where: {
      todo_app_todo_id: { in: props.body.todoIds },
      todo_app_user_id: props.user.id,
      restored_at: null,
      permanently_deleted_at: null,
    },
    include: {
      todo: true,
    },
  });
  // Check if all requested todos are available for restoration
  const foundIds = new Set(trashItems.map((item) => item.todo_app_todo_id));
  const missingIds = props.body.todoIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new HttpException(
      `Cannot restore todos that are not in your trash or are permanently deleted: ${missingIds.join(", ")}`,
      400,
    );
  }
  // Use transaction for atomic operations
  const restoredTodos = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update todos to mark them as active
    await prisma.todo_app_todos.updateMany({
      where: {
        id: { in: props.body.todoIds },
        todo_app_user_id: props.user.id,
      },
      data: {
        deleted_at: null,
        updated_at: new Date(currentTime),
      },
    });
    // Update trash items to mark them as restored
    await prisma.todo_app_trash_items.updateMany({
      where: {
        todo_app_todo_id: { in: props.body.todoIds },
        todo_app_user_id: props.user.id,
      },
      data: {
        restored_at: new Date(currentTime),
        updated_at: new Date(currentTime),
      },
    });
    // Create restoration audit records
    const restorationPromises = trashItems.map((item) =>
      prisma.todo_app_trash_restorations.create({
        data: {
          id: v4() as string,
          todo_app_trash_item_id: item.id,
          todo_app_user_id: props.user.id,
          created_at: new Date(currentTime),
          updated_at: new Date(currentTime),
        },
      }),
    );
    await Promise.all(restorationPromises);
    // Return the restored todos for the response
    return await prisma.todo_app_todos.findMany({
      where: {
        id: { in: props.body.todoIds },
        todo_app_user_id: props.user.id,
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  // Transform to summary DTO format
  const data = restoredTodos.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: todo.title,
    created_at: todo.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: todo.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: todo.deleted_at
      ? (todo.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
  }));
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
