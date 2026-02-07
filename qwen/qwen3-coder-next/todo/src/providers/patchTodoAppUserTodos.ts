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

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const whereConditions: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {
    created_at: "desc",
  };
  const page = 1;
  const limit = 100;
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const skip = (safePage - 1) * safeLimit;
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereConditions,
    skip,
    take: safeLimit,
    orderBy,
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_completed: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereConditions,
  });
  const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
  return {
    data: await ArrayUtil.asyncMap(data, async (todo) => ({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      start_date: todo.start_date ? toISOStringSafe(todo.start_date) : null,
      due_date: todo.due_date ? toISOStringSafe(todo.due_date) : null,
      is_completed: todo.is_completed,
      created_at: toISOStringSafe(todo.created_at),
    })),
    pagination: {
      current: safePage as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: safeLimit as number & tags.Type<"int32"> & tags.Minimum<1>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: totalPages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  };
}
