import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserListsListIdTasksTaskId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTask> {
  const { todoUser, listId, taskId } = props;

  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    include: {
      owner: {
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!list || list.deleted_at) throw new HttpException("Not Found", 404);

  if (list.visibility !== "public") {
    const isOwner = list.owner && list.owner.id === todoUser.id;
    if (!isOwner) {
      const membership =
        await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
          where: {
            todo_app_list_id: listId,
            todo_app_todouser_id: todoUser.id,
            deleted_at: null,
            accepted_at: { not: null },
          },
        });
      if (!membership)
        throw new HttpException(
          "Unauthorized: Only owner or accepted collaborators can access this list",
          403,
        );
    }
  }

  const task = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: taskId },
  });
  if (!task) throw new HttpException("Not Found", 404);
  if (task.todo_app_list_id !== listId)
    throw new HttpException("Not Found", 404);
  if (task.deleted_at) throw new HttpException("Not Found", 404);

  const relations = await MyGlobal.prisma.todo_app_task_tag_relations.findMany({
    where: { todo_app_task_id: taskId },
    include: { tag: true },
  });

  const tagsArray = relations.map((r) => ({
    id: r.tag.id,
    name: r.tag.name,
    createdAt: toISOStringSafe(r.tag.created_at),
    updatedAt: toISOStringSafe(r.tag.updated_at),
    deletedAt: r.tag.deleted_at ? toISOStringSafe(r.tag.deleted_at) : null,
  }));

  const owner = list.owner;
  const ownerSummary = {
    id: owner.id,
    displayName: owner.display_name ?? undefined,
    isVerified: owner.is_verified,
    status: owner.status ?? undefined,
    createdAt: toISOStringSafe(owner.created_at),
    updatedAt: toISOStringSafe(owner.updated_at),
  };

  const listSummary = {
    id: list.id,
    title: list.title,
    visibility: list.visibility,
    owner: ownerSummary,
    description: list.description ?? undefined,
    createdAt: toISOStringSafe(list.created_at),
    updatedAt: toISOStringSafe(list.updated_at),
    deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : undefined,
  };

  const result = {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    isCompleted: task.is_completed,
    completedAt: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    dueDate: task.due_date ? toISOStringSafe(task.due_date) : null,
    // Ensure priority is narrowed/validated to the literal union expected by ITodoAppTask
    priority: typia.assert<"low" | "medium" | "high" | "urgent" | null>(
      task.priority ?? null,
    ),
    createdAt: toISOStringSafe(task.created_at),
    updatedAt: toISOStringSafe(task.updated_at),
    list: listSummary,
    tags: tagsArray.length ? tagsArray : undefined,
    deletedAt: task.deleted_at ? toISOStringSafe(task.deleted_at) : null,
  };

  return result;
}
