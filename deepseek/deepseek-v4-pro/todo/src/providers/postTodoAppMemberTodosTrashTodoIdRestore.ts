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

export async function postTodoAppMemberTodosTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      member_id: props.member.id,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (todo.deleted_at === null) {
    throw new HttpException(
      "Restore operation is not applicable — the todo is not in the trash",
      400,
    );
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: null,
      updated_at: new Date().toISOString(),
    },
  });
  const restored = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      member_id: props.member.id,
    },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(restored);
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
// export async function postTodoAppMemberTodosTrashTodoIdRestore(props: {
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