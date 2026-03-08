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
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition for soft-deleted todos owned by member
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: { not: null },
    ...(props.body.completed !== undefined &&
      props.body.completed !== "all" && {
        completed: props.body.completed === "complete",
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
  } satisfies Prisma.todo_app_todosWhereInput;
  // Build order by condition with NULL handling
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = (() => {
    if (sortBy === "createdAt") {
      return { created_at: sortOrder };
    } else if (sortBy === "startDate") {
      return {
        start_date: {
          sort: sortOrder,
          nulls: "last",
        },
      };
    } else if (sortBy === "dueDate") {
      return {
        due_date: {
          sort: sortOrder,
          nulls: "last",
        },
      };
    } else {
      return {
        deleted_at: {
          sort: sortOrder,
          nulls: "last",
        },
      };
    }
  })() satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  // Fetch paginated todos
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  // Count total matching todos
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  // Transform to response DTOs
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
  } satisfies IPageITodoAppTodo.ISummary;
}
