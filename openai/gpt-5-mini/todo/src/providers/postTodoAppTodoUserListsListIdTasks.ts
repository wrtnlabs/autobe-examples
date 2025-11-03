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

export async function postTodoAppTodoUserListsListIdTasks(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppTask.ICreate;
}): Promise<ITodoAppTask> {
  const { todoUser, listId, body } = props;

  // STEP 1: Load list and owner for authorization and response embedding
  const list = await MyGlobal.prisma.todo_app_lists.findUniqueOrThrow({
    where: { id: listId },
    include: { owner: true },
  });

  // STEP 2: Authorization - owner OR collaborator with write role
  const isOwner = list.todo_app_todouser_id === todoUser.id;
  if (!isOwner) {
    const collaborator =
      await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
        where: {
          todo_app_list_id: listId,
          todo_app_todouser_id: todoUser.id,
          deleted_at: null,
        },
      });

    if (!collaborator || collaborator.role !== "read-write") {
      throw new HttpException(
        "Unauthorized: You are not allowed to add tasks to this list",
        403,
      );
    }
  }

  // STEP 3: Business validation - priority
  if (body.priority !== undefined && body.priority !== null) {
    const allowed = new Set(["low", "medium", "high", "urgent"] as const);
    if (!allowed.has(body.priority as any)) {
      throw new HttpException("Invalid priority", 422);
    }
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // STEP 4: Create the task
  const created = await MyGlobal.prisma.todo_app_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_list_id: listId,
      title: body.title,
      description: body.description ?? null,
      is_completed: body.isCompleted ?? false,
      completed_at: body.isCompleted ? now : null,
      due_date: body.dueDate ? toISOStringSafe(body.dueDate) : null,
      priority: body.priority ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // STEP 5: Handle tagNames (create or link canonical tags)
  const tagsResult: ITodoAppTaskTag.ISummary[] = [];
  if (Array.isArray(body.tagNames) && body.tagNames.length > 0) {
    for (const name of body.tagNames) {
      // find or create tag
      let tag = await MyGlobal.prisma.todo_app_task_tags.findFirst({
        where: { name },
      });
      if (!tag) {
        tag = await MyGlobal.prisma.todo_app_task_tags.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            name,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }

      // create relation
      await MyGlobal.prisma.todo_app_task_tag_relations.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_task_id: created.id,
          todo_app_task_tag_id: tag.id,
          created_at: now,
        },
      });

      tagsResult.push({
        id: tag.id,
        name: tag.name,
        createdAt: toISOStringSafe(tag.created_at),
        updatedAt: toISOStringSafe(tag.updated_at),
        deletedAt: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
      });
    }
  }

  // STEP 6: Emit audit and activity logs
  await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_todouser_id: todoUser.id,
        todo_app_todouser_session_id: todoUser.session_id,
        todo_app_list_id: listId,
        todo_app_task_id: created.id,
        event_type: "create_task",
        target_type: "task",
        target_id: created.id,
        details: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.todo_app_user_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_todouser_id: todoUser.id,
        todo_app_todouser_session_id: todoUser.session_id,
        todo_app_list_id: listId,
        todo_app_task_id: created.id,
        activity_type: "create_task",
        details: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);

  // STEP 7: Build and return DTO
  return {
    id: created.id,
    title: created.title,
    description: created.description ?? null,
    isCompleted: created.is_completed,
    completedAt: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    dueDate: created.due_date ? toISOStringSafe(created.due_date) : null,
    priority:
      created.priority != null
        ? typia.assert<"low" | "medium" | "high" | "urgent">(created.priority)
        : null,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    list: {
      id: list.id,
      title: list.title,
      visibility: list.visibility,
      owner: {
        id: list.owner.id,
        displayName: list.owner.display_name ?? null,
        isVerified: list.owner.is_verified,
        status: list.owner.status ?? undefined,
        createdAt: toISOStringSafe(list.owner.created_at),
        updatedAt: toISOStringSafe(list.owner.updated_at),
      },
      description: list.description ?? null,
      createdAt: toISOStringSafe(list.created_at),
      updatedAt: toISOStringSafe(list.updated_at),
      deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : null,
    },
    tags: tagsResult,
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
