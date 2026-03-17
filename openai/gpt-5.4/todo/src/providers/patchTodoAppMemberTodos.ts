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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              title: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.completed === "complete"
      ? { completed: true }
      : props.body.completed === "incomplete"
        ? { completed: false }
        : {}),
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { id: "asc" }]
        : props.body.sort === "updated_at_asc"
          ? [{ updated_at: "asc" }, { id: "asc" }]
          : props.body.sort === "updated_at_desc"
            ? [{ updated_at: "desc" }, { id: "asc" }]
            : props.body.sort === "start_date_asc"
              ? [
                  { start_date: { sort: "asc", nulls: "last" } },
                  { updated_at: "desc" },
                  { id: "asc" },
                ]
              : props.body.sort === "start_date_desc"
                ? [
                    { start_date: { sort: "desc", nulls: "last" } },
                    { updated_at: "desc" },
                    { id: "asc" },
                  ]
                : props.body.sort === "due_date_asc"
                  ? [
                      { due_date: { sort: "asc", nulls: "last" } },
                      { updated_at: "desc" },
                      { id: "asc" },
                    ]
                  : props.body.sort === "due_date_desc"
                    ? [
                        { due_date: { sort: "desc", nulls: "last" } },
                        { updated_at: "desc" },
                        { id: "asc" },
                      ]
                    : [{ updated_at: "desc" }, { id: "asc" }];
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
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
    } satisfies IPage.IPagination,
  };
}
