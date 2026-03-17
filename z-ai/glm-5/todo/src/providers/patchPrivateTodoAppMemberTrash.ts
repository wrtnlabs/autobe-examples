import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodo";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppTodoAtSummaryTransformer } from "../transformers/PrivateTodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchPrivateTodoAppMemberTrash(props: {
  member: MemberPayload;
  body: IPrivateTodoAppTodo.IRequest;
}): Promise<IPageIPrivateTodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    user_id: props.member.id,
    deleted_at: { not: null },
    ...(props.body.search && {
      title: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.completed === "complete" && { completed: true }),
    ...(props.body.completed === "incomplete" && { completed: false }),
  } satisfies Prisma.private_todo_app_todosWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput = (() => {
    if (sortField === "created_at") {
      return { created_at: sortOrder };
    }
    if (sortField === "start_date") {
      return sortOrder === "asc"
        ? { start_date: { sort: "asc", nulls: "last" as const } }
        : { start_date: { sort: "desc", nulls: "first" as const } };
    }
    if (sortField === "due_date") {
      return sortOrder === "asc"
        ? { due_date: { sort: "asc", nulls: "last" as const } }
        : { due_date: { sort: "desc", nulls: "first" as const } };
    }
    return { created_at: sortOrder };
  })() satisfies Prisma.private_todo_app_todosOrderByWithRelationInput;
  const data = await MyGlobal.prisma.private_todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...PrivateTodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.private_todo_app_todos.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      PrivateTodoAppTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
