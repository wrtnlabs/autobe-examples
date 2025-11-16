import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { IPageITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodosTodoIdSnapshots(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoSnapshot.IRequest;
}): Promise<IPageITodoAppTodoSnapshot.ISummary> {
  // Verify the todo exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.todo_app_user_id !== props.user.id) {
    throw new HttpException("Access denied", 403);
  }

  // Build WHERE conditions for snapshot filtering
  const whereCondition: Prisma.todo_app_todo_snapshotsWhereInput = {
    todo_app_todo_id: props.todoId,
    ...(props.body.status_ids &&
      props.body.status_ids.length > 0 && {
        todo_app_todo_status_id: { in: props.body.status_ids },
      }),
    ...(props.body.priority_ids &&
      props.body.priority_ids.length > 0 && {
        todo_app_todo_priority_id: { in: props.body.priority_ids },
      }),
    ...(props.body.completed_only !== undefined && {
      completed_at: props.body.completed_only ? { not: null } : null,
    }),
    ...(props.body.created_after && {
      snapshot_created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before && {
      snapshot_created_at: { lte: props.body.created_before },
    }),
  };

  // Determine sorting
  const orderBy: Prisma.todo_app_todo_snapshotsOrderByWithRelationInput = {};
  if (props.body.sort_by === "completed_at") {
    orderBy.completed_at = props.body.order || "desc";
  } else {
    orderBy.snapshot_created_at = props.body.order || "desc";
  }

  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Execute paginated query with relationships
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_snapshots.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        status: true,
        priority: true,
      },
    }),
    MyGlobal.prisma.todo_app_todo_snapshots.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to match API contract
  const transformedData = data.map((snapshot) => ({
    id: snapshot.id,
    todo_app_todo_id: snapshot.todo_app_todo_id,
    todo_app_todo_status_id: snapshot.todo_app_todo_status_id,
    todo_app_todo_priority_id:
      snapshot.todo_app_todo_priority_id === null
        ? undefined
        : snapshot.todo_app_todo_priority_id,
    status: {
      id: snapshot.status.id,
      code: snapshot.status.code,
      name: snapshot.status.name,
      is_active: snapshot.status.is_active,
    },
    priority: snapshot.priority
      ? {
          id: snapshot.priority.id,
          code: snapshot.priority.code,
          name: snapshot.priority.name,
          description:
            snapshot.priority.description === null
              ? undefined
              : snapshot.priority.description,
          weight: snapshot.priority.weight,
          is_active:
            snapshot.priority.is_active === null
              ? undefined
              : snapshot.priority.is_active,
          created_at: toISOStringSafe(snapshot.priority.created_at),
        }
      : undefined,
    completed_at: snapshot.completed_at
      ? toISOStringSafe(snapshot.completed_at)
      : undefined,
    snapshot_created_at: toISOStringSafe(snapshot.snapshot_created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
