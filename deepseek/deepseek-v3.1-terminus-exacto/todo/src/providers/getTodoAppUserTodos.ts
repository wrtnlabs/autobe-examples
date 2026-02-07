import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

export async function getTodoAppUserTodos(props: {
  user: UserPayload;
}): Promise<IPageITodoAppTodo> {
  // Use default pagination values since no request body parameters are defined
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  try {
    // Get paginated todos for the authenticated user
    const data = await MyGlobal.prisma.todo_app_todos.findMany({
      where: {
        todo_app_user_id: props.user.id,
        deleted_at: null, // Only active todos (not soft-deleted)
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" }, // Show newest todos first
      ...TodoAppTodoTransformer.select(),
    });
    // Get total count for pagination metadata
    const total = await MyGlobal.prisma.todo_app_todos.count({
      where: {
        todo_app_user_id: props.user.id,
        deleted_at: null,
      },
    });
    // Transform database records to API response format
    const transformedData = await ArrayUtil.asyncMap(
      data,
      TodoAppTodoTransformer.transform,
    );
    return {
      data: transformedData,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve user todos", 500);
  }
}
