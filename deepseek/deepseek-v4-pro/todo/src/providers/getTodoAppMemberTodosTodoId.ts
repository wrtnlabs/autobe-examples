import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const transformerSelect = TodoAppTodoTransformer.select();
  const record = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      ...transformerSelect.select,
      member_id: true,
      deleted_at: true,
    },
  });
  if (record.member_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await TodoAppTodoTransformer.transform(record);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getTodoAppMemberTodosTodoId(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
// }): Promise<ITodoAppTodo> {
//   const record = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
//     ...TodoAppTodoTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppTodoTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------