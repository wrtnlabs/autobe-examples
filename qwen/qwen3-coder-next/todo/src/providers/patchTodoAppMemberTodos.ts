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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const limit = props.body.limit;
  const offset = props.body.offset ?? 0;
  // Determine sort field and direction with proper null handling
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {};
  switch (props.body.sort_by) {
    case "created_at":
      orderBy.created_at = props.body.sort_order;
      break;
    case "start_date":
      orderBy.start_date = props.body.sort_order;
      break;
    case "due_date":
      orderBy.due_date = props.body.sort_order;
      break;
  }
  // Determine filter for is_complete
  let isCompleteFilter: boolean | undefined;
  if (props.body.is_complete === "true") {
    isCompleteFilter = true;
  } else if (props.body.is_complete === "false") {
    isCompleteFilter = false;
  }
  // 'all' means no filter (undefined)
  // Build where clause with user isolation
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.member.id,
    is_complete: isCompleteFilter,
    // Add search filtering if search term is provided
    ...(props.body.search !== undefined && {
      title: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  };
  // Execute queries sequentially
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    select: {
      id: true,
      title: true,
      is_complete: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  // Transform results to ISummary format with proper datetime conversion
  const summaries: ITodoAppTodo.ISummary[] = data.map((todo) => ({
    id: todo.id,
    title: todo.title,
    is_complete: todo.is_complete,
    created_at: todo.created_at.toISOString(),
  }));
  // Calculate pagination information
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  const current = Math.floor(offset / limit) + 1;
  return {
    data: summaries,
    pagination: {
      current: current as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  };
}
