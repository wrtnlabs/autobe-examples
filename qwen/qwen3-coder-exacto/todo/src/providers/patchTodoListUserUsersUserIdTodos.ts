import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { IPageITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdTodos(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserTodo.IRequest;
}): Promise<IPageITodoListUserTodo.ISummary> {
  // Check if the requesting user has permission to access these todos
  // For now, we'll allow users to access their own todos
  // In a more complex system, we might check for admin privileges
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own todos",
      403,
    );
  }

  // Set default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Find the user to ensure they exist
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Retrieve todos with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: {
        todo_list_user_id: props.userId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_user_id: props.userId,
        deleted_at: null,
      },
    }),
  ]);

  // Transform to DTO format
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((todo) => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
    })),
  };
}
