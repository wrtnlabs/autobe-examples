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
  // Build where clause
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.member.id,
    is_trashed: false,
    deleted_at: null,
  };
  // Status filter
  if (props.body.status) {
    if (props.body.status === "complete") {
      where.is_complete = true;
    } else if (props.body.status === "incomplete") {
      where.is_complete = false;
    }
  }
  // Build order by clause
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput[] = [];
  if (props.body.sort) {
    if (props.body.sort === "createdAt") {
      orderBy.push({ created_at: props.body.direction ?? "desc" });
    } else if (props.body.sort === "startAt") {
      orderBy.push({ start_date: props.body.direction ?? "desc" });
    } else if (props.body.sort === "dueAt") {
      orderBy.push({ due_date: props.body.direction ?? "desc" });
    }
  } else {
    orderBy.push({ created_at: "desc" });
  }
  // Fetch data
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
