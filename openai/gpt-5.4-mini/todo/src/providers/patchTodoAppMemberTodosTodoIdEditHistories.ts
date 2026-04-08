import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoEditHistory.IRequest;
}): Promise<IPageITodoAppTodoEditHistory.ISummary> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
    },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.todo_app_todo_edit_historiesWhereInput = {
    todo_app_todo_id: props.todoId,
    ...(props.body.search === undefined || props.body.search.length === 0
      ? {}
      : {
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
        }),
  };
  const records = await MyGlobal.prisma.todo_app_todo_edit_histories.findMany({
    where,
    orderBy: {
      edited_at: "desc",
    },
    skip,
    take: limit,
    ...TodoAppTodoEditHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todo_edit_histories.count({
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
      TodoAppTodoEditHistoryAtSummaryTransformer.transform,
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
// import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
// import { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
//   body: ITodoAppTodoEditHistory.IRequest;
// }): Promise<IPageITodoAppTodoEditHistory.ISummary> {
//   const records = await MyGlobal.prisma.todo_app_todo_edit_histories.findMany({
//     ...TodoAppTodoEditHistoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, TodoAppTodoEditHistoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------