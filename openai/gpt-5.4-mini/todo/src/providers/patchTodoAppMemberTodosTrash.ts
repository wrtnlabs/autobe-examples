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

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    todo_app_member_id: props.member.id,
    deleted_at: { not: null },
    ...(props.body.completionStatus === "complete"
      ? { is_completed: true }
      : props.body.completionStatus === "incomplete"
        ? { is_completed: false }
        : {}),
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderBy = (() => {
    const direction = props.body.sortOrder ?? "desc";
    if (props.body.sortBy === "startDate") {
      return [
        { start_date: direction },
        { created_at: "desc" },
      ] satisfies Prisma.todo_app_todosOrderByWithRelationInput[];
    }
    if (props.body.sortBy === "dueDate") {
      return [
        { due_date: direction },
        { created_at: "desc" },
      ] satisfies Prisma.todo_app_todosOrderByWithRelationInput[];
    }
    if (props.body.sortBy === "createdAt") {
      return [
        { created_at: direction },
      ] satisfies Prisma.todo_app_todosOrderByWithRelationInput[];
    }
    return [
      { created_at: "desc" },
    ] satisfies Prisma.todo_app_todosOrderByWithRelationInput[];
  })();
  const records = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({ where });
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
// export async function patchTodoAppMemberTodosTrash(props: {
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