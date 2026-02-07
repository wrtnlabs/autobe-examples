import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
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

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  let whereInput: Prisma.todo_todosWhereInput = {
    deleted_at: null,
    user: { id: props.user.id },
  };
  // Add status filter if provided
  if (props.body.status === "completed") {
    whereInput = {
      ...whereInput,
      is_completed: true,
    };
  } else if (props.body.status === "incomplete") {
    whereInput = {
      ...whereInput,
      is_completed: false,
    };
  }
  // Build sort criteria
  let orderByInput: Prisma.todo_todosOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sortField === "startDate" && props.body.sortDirection) {
    orderByInput = {
      start_date: props.body.sortDirection as "asc" | "desc",
    };
  } else if (props.body.sortField === "dueDate" && props.body.sortDirection) {
    orderByInput = {
      due_date: props.body.sortDirection as "asc" | "desc",
    };
  }
  // Handle pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Fetch the data
  const data = await MyGlobal.prisma.todo_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      is_completed: true,
      created_at: true,
      due_date: true,
      user: {
        select: {
          id: true,
        },
      },
    },
  });
  // Transform each item using API-specific DTO mapping
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    return {
      id: item.id,
      title: item.title,
      is_completed: item.is_completed,
      created_at: toISOStringSafe(item.created_at),
      due_date: item.due_date ? toISOStringSafe(item.due_date) : null,
      user: {
        id: item.user.id,
      },
    } as ITodoTodo.ISummary;
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_todos.count({
    where: whereInput,
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
