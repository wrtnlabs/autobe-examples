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

export async function patchTodoAppUserTasks(props: {
  user: UserPayload;
  body: ITodoAppTask.IRequest;
}): Promise<IPageITodoAppTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Build where conditions with proper typing
  let whereConditions: Prisma.todo_app_tasksWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };

  // Add search if provided
  if (props.body.search && props.body.search.trim()) {
    const searchTerm = props.body.search.trim();
    whereConditions.OR = [
      { title: { contains: searchTerm } },
      { description: { contains: searchTerm } },
    ];
  }

  // Add status filter
  if (props.body.status) {
    if (!["pending", "completed"].includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
    whereConditions.status = props.body.status;
  }

  // Add priority filter
  if (props.body.priority) {
    if (!["none", "low", "medium", "high"].includes(props.body.priority)) {
      throw new HttpException("Invalid priority value", 400);
    }
    whereConditions.priority = props.body.priority;
  }

  // Add due date ranges
  if (props.body.due_before || props.body.due_after) {
    whereConditions.due_date = {};
    if (props.body.due_before) {
      whereConditions.due_date.lte = props.body.due_before;
    }
    if (props.body.due_after) {
      whereConditions.due_date.gte = props.body.due_after;
    }
  }

  // Build order by
  const validOrderBy = ["due_date", "priority", "created_at", "updated_at"];
  const orderField = validOrderBy.includes(props.body.order_by ?? "")
    ? props.body.order_by!
    : "created_at";
  const orderDirection = props.body.order_direction === "asc" ? "asc" : "desc";

  const orderBy: Prisma.todo_app_tasksOrderByWithRelationInput = {
    [orderField]: orderDirection,
  };

  // Execute queries
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

  // Transform results with proper type handling
  const data: ITodoAppTask.ISummary[] = tasks.map((task) => {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      created_at: toISOStringSafe(task.created_at),
      updated_at: toISOStringSafe(task.updated_at),
      // Handle optional fields with proper null/undefined typing
      due_date:
        task.due_date === null ? undefined : toISOStringSafe(task.due_date),
      priority: task.priority === null ? undefined : task.priority,
      completed_at:
        task.completed_at === null
          ? undefined
          : toISOStringSafe(task.completed_at),
      todo_app_user_id: task.todo_app_user_id,
      user: {
        id: task.user.id,
        email: task.user.email,
        name: task.user.name === null ? undefined : task.user.name,
        status: task.user.status,
        created_at: toISOStringSafe(task.user.created_at),
      },
    };
  });

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
