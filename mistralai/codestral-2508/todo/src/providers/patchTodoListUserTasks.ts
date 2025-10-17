import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTasks(props: {
  user: UserPayload;
  body: ITodoListTask.IRequest;
}): Promise<IPageITodoListTask.ISummary> {
  // Validate and sanitize pagination parameters
  const page = Math.max(1, Number(props.body.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(props.body.limit ?? 20)));

  // Validate search term length if provided
  if (props.body.search && props.body.search.length > 100) {
    throw new HttpException("Search term too long", 400);
  }

  // Build where conditions with proper type handling
  const where: Prisma.todo_list_tasksWhereInput = {
    todo_list_user_id: props.user.id,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.deadline && {
      deadline: { gte: props.body.deadline },
    }),
    ...(props.body.priority && {
      todo_list_task_priorities: {
        priority_level: props.body.priority,
      },
    }),
  };

  // Get total count with proper error handling
  let total: number;
  try {
    total = await MyGlobal.prisma.todo_list_tasks.count({ where });
  } catch (error) {
    throw new HttpException("Failed to count tasks", 500);
  }

  // Get paginated results with proper error handling
  let tasks: Prisma.todo_list_tasksGetPayload<{
    include: { todo_list_task_priorities: true };
  }>[];
  try {
    tasks = await MyGlobal.prisma.todo_list_tasks.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        todo_list_task_priorities: true,
      },
    });
  } catch (error) {
    throw new HttpException("Failed to fetch tasks", 500);
  }

  // Convert to API response format with proper type handling
  const data: ITodoListTask.ISummary[] = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    title: task.title,
    description: task.description,
    deadline: task.deadline ? toISOStringSafe(task.deadline) : undefined,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
  }));

  // Calculate pagination info with proper type handling
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  } satisfies IPageITodoListTask.ISummary;
}
