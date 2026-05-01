import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryAtSummaryTransformer } from "../transformers/TodoAppEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppEditHistory.IRequest;
}): Promise<IPageITodoAppEditHistory.ISummary> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, member_id: true },
  });
  if (todo.member_id !== props.member.id) {
    throw new HttpException("Access denied", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_todo_id: props.todoId,
  } satisfies Prisma.todo_app_edit_historiesWhereInput;
  const data = await MyGlobal.prisma.todo_app_edit_histories.findMany({
    where: whereInput,
    ...TodoAppEditHistoryAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.todo_app_edit_histories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppEditHistoryAtSummaryTransformer.transform,
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
// import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
// import { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
//   body: ITodoAppEditHistory.IRequest;
// }): Promise<IPageITodoAppEditHistory.ISummary> {
//   const records = await MyGlobal.prisma.todo_app_edit_histories.findMany({
//     ...TodoAppEditHistoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, TodoAppEditHistoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------