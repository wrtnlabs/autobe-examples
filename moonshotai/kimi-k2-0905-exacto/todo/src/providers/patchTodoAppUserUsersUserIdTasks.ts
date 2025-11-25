import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsersUserIdTasks(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppTask.IRequest;
}): Promise<IPageITodoAppTask.ISummary> {
  // Validate that user can only search their own tasks
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden - can only search your own tasks", 403);
  }

  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Parse sorting parameters
  let orderBy: Prisma.todo_app_tasksOrderByWithRelationInput = {};
  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction === "asc" ? "asc" : "desc";

  switch (orderByField) {
    case "due_date":
      orderBy = { due_date: orderDirection };
      break;
    case "priority":
      // Use case statement to handle priority ordering
      orderBy = { priority: orderDirection };
      break;
    case "created_at":
      orderBy = { created_at: orderDirection };
      break;
    case "updated_at":
      orderBy = { updated_at: orderDirection };
      break;
    default:
      orderBy = { created_at: "desc" };
  }

  // Build where conditions
  const whereConditions: Prisma.todo_app_tasksWhereInput = {
    todo_app_user_id: props.userId,
    deleted_at: null,
  };

  // Add status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Add priority filter
  if (props.body.priority) {
    whereConditions.priority = props.body.priority;
  }

  // Add due date filters
  if (props.body.due_before) {
    whereConditions.due_date = {
      ...(whereConditions.due_date as any),
      lte: props.body.due_before,
    };
  }

  if (props.body.due_after) {
    whereConditions.due_date = {
      ...(whereConditions.due_date as any),
      gte: props.body.due_after,
    };
  }

  // Add text search filter
  if (props.body.search) {
    whereConditions.OR = [
      {
        title: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    ];
  }

  // Execute database queries
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_app_tasks.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
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
    }),
    MyGlobal.prisma.todo_app_tasks.count({
      where: whereConditions,
    }),
  ]);

  // Format response
  const taskSummaries: ITodoAppTask.ISummary[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    todo_app_user_id: task.todo_app_user_id,
    user: {
      id: task.user.id,
      email: task.user.email as string & tags.Format<"email">,
      name: task.user.name,
      status: task.user.status,
      created_at: toISOStringSafe(task.user.created_at),
    },
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: taskSummaries,
  };
}
