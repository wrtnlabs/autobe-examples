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
  const completion = props.body.completion ?? "all";
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const search = props.body.search;
  const whereInput: Prisma.todo_app_todosWhereInput = {
    member_id: props.member.id,
    deleted_at: null,
  };
  if (completion === "complete") {
    whereInput.completed_at = { not: null };
  } else if (completion === "incomplete") {
    whereInput.completed_at = null;
  }
  if (search) {
    whereInput.title = { contains: search, mode: "insensitive" };
  }
  const orderByInput: Prisma.todo_app_todosOrderByWithRelationInput =
    sort === "created_at"
      ? { created_at: direction }
      : sort === "start_date"
        ? { start_date: { sort: direction, nulls: "last" } }
        : { due_date: { sort: direction, nulls: "last" } };
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