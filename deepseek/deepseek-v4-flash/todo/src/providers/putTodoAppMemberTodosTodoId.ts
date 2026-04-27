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
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      deleted_at: true,
    },
  });
  if (todo === null || todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  if (todo.deleted_at !== null) {
    throw new HttpException("Cannot edit a trashed todo", 400);
  }
  const now: string = new Date().toISOString();
  const updateData: Prisma.todo_app_todosUpdateInput = {
    updated_at: now,
  };
  const titleChanged =
    props.body.title !== undefined && props.body.title !== todo.title;
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  const descriptionChanged =
    props.body.description !== undefined &&
    props.body.description !== todo.description;
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  const startDateChanged =
    props.body.start_date !== undefined &&
    ((props.body.start_date === null && todo.start_date !== null) ||
      (props.body.start_date !== null && todo.start_date === null) ||
      (props.body.start_date !== null &&
        todo.start_date !== null &&
        formatDateOnly(props.body.start_date) !==
          formatDateOnly(todo.start_date.toISOString())));
  if (props.body.start_date !== undefined) {
    updateData.start_date =
      props.body.start_date !== null ? props.body.start_date : null;
  }
  const dueDateChanged =
    props.body.due_date !== undefined &&
    ((props.body.due_date === null && todo.due_date !== null) ||
      (props.body.due_date !== null && todo.due_date === null) ||
      (props.body.due_date !== null &&
        todo.due_date !== null &&
        formatDateOnly(props.body.due_date) !==
          formatDateOnly(todo.due_date.toISOString())));
  if (props.body.due_date !== undefined) {
    updateData.due_date =
      props.body.due_date !== null ? props.body.due_date : null;
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  if (
    titleChanged ||
    descriptionChanged ||
    startDateChanged ||
    dueDateChanged
  ) {
    await MyGlobal.prisma.todo_app_edit_histories.create({
      data: {
        id: v4(),
        todo: { connect: { id: props.todoId } },
        created_at: now,
        title: titleChanged ? props.body.title : null,
        description: descriptionChanged ? props.body.description : null,
        start_date: startDateChanged
          ? props.body.start_date !== null
            ? props.body.start_date
            : null
          : null,
        due_date: dueDateChanged
          ? props.body.due_date !== null
            ? props.body.due_date
            : null
          : null,
      },
    });
  }
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
function formatDateOnly(iso: string): string {
  return iso.slice(0, 10);
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