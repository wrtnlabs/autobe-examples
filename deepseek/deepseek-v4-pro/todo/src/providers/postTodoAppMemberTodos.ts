import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppTodoCollector } from "../collectors/TodoAppTodoCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  if (!props.body.title.trim()) {
    throw new HttpException("Title must not be empty.", 400);
  }
  if (props.body.start_date != null && props.body.due_date != null) {
    if (props.body.due_date < props.body.start_date) {
      throw new HttpException(
        "Due date must not be earlier than start date.",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.todo_app_todos.create({
    data: await TodoAppTodoCollector.collect({
      body: props.body,
      member: { id: props.member.id },
    }),
    ...TodoAppTodoTransformer.select(),
  });
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
// export async function postTodoAppMemberTodos(props: {
//   member: MemberPayload;
//   body: ITodoAppTodo.ICreate;
// }): Promise<ITodoAppTodo> {
//   const record = await MyGlobal.prisma.todo_app_todos.create({
//     data: await TodoAppTodoCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...TodoAppTodoTransformer.select(),
//   });
//   return await TodoAppTodoTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------