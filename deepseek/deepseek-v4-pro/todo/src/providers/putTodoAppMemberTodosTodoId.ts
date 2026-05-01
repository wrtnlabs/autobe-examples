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

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const current = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
  });
  if (current.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (current.deleted_at !== null) {
    throw new HttpException("Todo is in trash and cannot be edited", 400);
  }
  if (props.body.title !== undefined && props.body.title.trim().length === 0) {
    throw new HttpException("Title must not be empty", 400);
  }
  const currentStartDate: string | null =
    current.start_date?.toISOString() ?? null;
  const currentDueDate: string | null = current.due_date?.toISOString() ?? null;
  const effectiveStartDate: string | null =
    props.body.start_date !== undefined
      ? props.body.start_date
      : currentStartDate;
  const effectiveDueDate: string | null =
    props.body.due_date !== undefined ? props.body.due_date : currentDueDate;
  if (
    effectiveStartDate !== null &&
    effectiveDueDate !== null &&
    effectiveDueDate < effectiveStartDate
  ) {
    throw new HttpException(
      "Due date must not be earlier than start date",
      400,
    );
  }
  const newTitle: string =
    props.body.title !== undefined ? props.body.title : current.title;
  const newDescription: string | null =
    props.body.description !== undefined
      ? props.body.description
      : current.description;
  const newStartDate: string | null =
    props.body.start_date !== undefined
      ? props.body.start_date
      : currentStartDate;
  const newDueDate: string | null =
    props.body.due_date !== undefined ? props.body.due_date : currentDueDate;
  const hasChanges: boolean =
    newTitle !== current.title ||
    newDescription !== current.description ||
    newStartDate !== currentStartDate ||
    newDueDate !== currentDueDate;
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date,
      }),
      updated_at: now,
    },
  });
  if (hasChanges) {
    await MyGlobal.prisma.todo_app_edit_histories.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
        created_at: now,
        updated_at: now,
      },
    });
  }
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