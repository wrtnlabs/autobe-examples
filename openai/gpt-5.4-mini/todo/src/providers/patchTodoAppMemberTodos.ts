import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  if (page < 1 || !Number.isInteger(page))
    throw new HttpException("Invalid page", 400);
  if (limit < 1 || !Number.isInteger(limit))
    throw new HttpException("Invalid limit", 400);
  const completionStatus: "all" | "complete" | "incomplete" =
    props.body.completionStatus ?? "all";
  const sortBy: "createdAt" | "startDate" | "dueDate" =
    props.body.sortBy ?? "createdAt";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  if (
    completionStatus !== "all" &&
    completionStatus !== "complete" &&
    completionStatus !== "incomplete"
  ) {
    throw new HttpException("Invalid completion status", 400);
  }
  if (
    sortBy !== "createdAt" &&
    sortBy !== "startDate" &&
    sortBy !== "dueDate"
  ) {
    throw new HttpException("Invalid sort field", 400);
  }
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new HttpException("Invalid sort order", 400);
  }
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(completionStatus === "complete"
      ? { is_completed: true }
      : completionStatus === "incomplete"
        ? { is_completed: false }
        : {}),
  };
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput[] =
    sortBy === "createdAt"
      ? [{ created_at: sortOrder }, { id: "desc" }]
      : sortBy === "startDate"
        ? [
            { start_date: { sort: sortOrder, nulls: "last" } },
            { created_at: "desc" },
            { id: "desc" },
          ]
        : [
            { due_date: { sort: sortOrder, nulls: "last" } },
            { created_at: "desc" },
            { id: "desc" },
          ];
  const records = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
// import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberTodos(props: {
//   member: MemberPayload;
//   body: ITodoAppTodo.IRequest;
// }): Promise<IPageITodoAppTodo.ISummary> {
//   const records = await MyGlobal.prisma.todo_app_todos.findMany({
//     ...TodoAppTodoAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, TodoAppTodoAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------