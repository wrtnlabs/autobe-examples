import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function deleteTodoListTodoListMemberActorsMe(props: {
  todoListMember: TodolistmemberPayload;
}): Promise<void> {
  // Start a transaction to guarantee atomic removal of all user data
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_todos.deleteMany({
      where: { todo_list_todolistmember_id: props.todoListMember.id },
    }),
    MyGlobal.prisma.todo_list_todolistmember_sessions.deleteMany({
      where: { todo_list_todolistmember_id: props.todoListMember.id },
    }),
    MyGlobal.prisma.todo_list_todolistmembers.delete({
      where: { id: props.todoListMember.id },
    }),
  ]);
}
