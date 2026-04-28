import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryTransformer } from "../transformers/TodoAppEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdEditHistoriesEditHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppEditHistory> {
  const record = await MyGlobal.prisma.todo_app_edit_histories.findFirstOrThrow(
    {
      ...TodoAppEditHistoryTransformer.select(),
      where: {
        id: props.editHistoryId,
        todo_app_todo_id: props.todoId,
        todo: {
          todo_app_member_id: props.member.id,
        },
      },
    },
  );
  return await TodoAppEditHistoryTransformer.transform(record);
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
// import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getTodoAppMemberTodosTodoIdEditHistoriesEditHistoryId(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
//   editHistoryId: string & tags.Format<"uuid">;
// }): Promise<ITodoAppEditHistory> {
//   const record = await MyGlobal.prisma.todo_app_edit_histories.findFirstOrThrow({
//     ...TodoAppEditHistoryTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppEditHistoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------