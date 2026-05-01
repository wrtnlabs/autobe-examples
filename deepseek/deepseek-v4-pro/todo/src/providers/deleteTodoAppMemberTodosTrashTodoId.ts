import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppMemberTodosTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: { id: true, member_id: true, deleted_at: true },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.deleted_at === null) {
    throw new HttpException(
      "Cannot permanently delete an active todo. Soft-delete it first.",
      422,
    );
  }
  await MyGlobal.prisma.todo_app_edit_histories.deleteMany({
    where: { todo_app_todo_id: props.todoId },
  });
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteTodoAppMemberTodosTrashTodoId(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------