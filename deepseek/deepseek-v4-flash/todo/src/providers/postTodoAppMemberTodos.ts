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
import { TodoAppTodoCollector } from "../collectors/TodoAppTodoCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Validate title: must be a non-empty, non-whitespace string
  if (props.body.title.trim().length === 0) {
    throw new HttpException("Title must be a non-empty string", 400);
  }
  // Validate date constraint: if both start_date and due_date are provided,
  // due_date must not precede start_date (date-only values; ISO 8601 string
  // comparison is valid for date-only values)
  if (
    props.body.start_date != null &&
    props.body.due_date != null &&
    props.body.due_date < props.body.start_date
  ) {
    throw new HttpException("Due date must not precede start date", 400);
  }
  const record = await MyGlobal.prisma.todo_app_todos.create({
    data: await TodoAppTodoCollector.collect({
      body: props.body,
      todoAppMembers: { id: props.member.id },
      todoAppMemberSessions: { id: props.member.session_id },
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
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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