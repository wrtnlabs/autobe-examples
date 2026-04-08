import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
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
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined ? { title: props.body.title } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.startDate !== undefined
        ? {
            start_date:
              props.body.startDate === null
                ? null
                : new Date(props.body.startDate),
          }
        : {}),
      ...(props.body.dueDate !== undefined
        ? {
            due_date:
              props.body.dueDate === null ? null : new Date(props.body.dueDate),
          }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
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
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putTodoAppMemberTodosTodoId(props: {
//   member: MemberPayload;
//   todoId: string & tags.Format<"uuid">;
//   body: ITodoAppTodo.IUpdate;
// }): Promise<ITodoAppTodo> {
//   await MyGlobal.prisma.todo_app_todos.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
//     where: { ... },
//     ...TodoAppTodoTransformer.select(),
//   });
//   return await TodoAppTodoTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------