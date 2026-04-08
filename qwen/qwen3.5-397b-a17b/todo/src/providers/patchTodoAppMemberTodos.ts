import { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import { IETodoAppTodoFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppTodoFilter";
import { IETodoAppTodoSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppTodoSort";
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

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const filter = props.body.filter ?? "all";
  const sort = props.body.sort ?? "creation_date";
  const sortDirection = props.body.sortDirection ?? "DESC";
  const whereInput = {
    todo_app_member_id: props.member.id,
    is_deleted: false,
    ...(filter === "complete" && { is_completed: true }),
    ...(filter === "incomplete" && { is_completed: false }),
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderByInput = (() => {
    if (sort === "creation_date") {
      return { created_at: sortDirection === "ASC" ? "asc" : "desc" };
    } else if (sort === "start_date") {
      return { start_date: sortDirection === "ASC" ? "asc" : "desc" };
    } else if (sort === "due_date") {
      return { due_date: sortDirection === "ASC" ? "asc" : "desc" };
    }
    return { created_at: "desc" };
  })() satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
  };
}
