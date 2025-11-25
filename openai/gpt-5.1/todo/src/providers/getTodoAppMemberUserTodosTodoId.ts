import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getTodoAppMemberUserTodosTodoId(props: {
  memberUser: MemberuserPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  // Retrieve the todo item ensuring it belongs to the authenticated member user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
      deleted_at: null,
    },
  });

  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }

  // Retrieve the owning member user to build the summary object
  const owner = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUser.id,
    },
  });

  if (owner === null) {
    // Authorization should normally guarantee existence, but guard against
    // inconsistent state in the database.
    throw new HttpException("Member user not found", 404);
  }

  const memberUserSummary: ITodoAppMemberUser.ISummary = {
    id: owner.id,
    email: owner.email,
    display_name: owner.display_name === null ? null : owner.display_name,
    status: owner.status,
    created_at: toISOStringSafe(owner.created_at),
  };

  const description = todo.description === null ? null : todo.description;
  const dueDate =
    todo.due_date === null ? null : toISOStringSafe(todo.due_date);
  const completedAt =
    todo.completed_at === null ? null : toISOStringSafe(todo.completed_at);
  const deletedAt =
    todo.deleted_at === null ? null : toISOStringSafe(todo.deleted_at);

  return {
    id: todo.id,
    memberUser: memberUserSummary,
    title: todo.title,
    description,
    state: todo.state,
    due_date: dueDate,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at: completedAt,
    deleted_at: deletedAt,
  };
}
