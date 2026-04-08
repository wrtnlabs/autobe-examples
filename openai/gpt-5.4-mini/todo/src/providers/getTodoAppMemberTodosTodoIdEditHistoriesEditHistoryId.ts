import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditHistoryTransformer } from "../transformers/TodoAppTodoEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdEditHistoriesEditHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoEditHistory> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
    },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.todo_app_todo_edit_histories.findFirstOrThrow({
      where: {
        id: props.editHistoryId,
        todo_app_todo_id: props.todoId,
      },
      ...TodoAppTodoEditHistoryTransformer.select(),
    });
  return await TodoAppTodoEditHistoryTransformer.transform(record);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getTodoAppMemberTodosTodoIdEditHistoriesEditHistoryId(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
//   editHistoryId: string & tags.Format<"uuid">;
// }): Promise<ITodoAppTodoEditHistory> {
//   const record = await MyGlobal.prisma.todo_app_todo_edit_histories.findFirstOrThrow({
//     ...TodoAppTodoEditHistoryTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppTodoEditHistoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------