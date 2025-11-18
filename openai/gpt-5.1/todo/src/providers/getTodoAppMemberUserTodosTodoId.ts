import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getTodoAppMemberUserTodosTodoId(props: {
  memberUser: MemberuserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
      deleted_at: null,
    },
    include: {
      memberUser: true,
    },
  });

  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }

  const owner = todo.memberUser;

  const memberUserSummary: ITodoAppMemberuser.ISummary = {
    id: owner.id,
    email: owner.email,
    display_name:
      owner.display_name !== null && owner.display_name !== undefined
        ? owner.display_name
        : null,
    status: owner.status,
    last_login_at:
      owner.last_login_at !== null && owner.last_login_at !== undefined
        ? toISOStringSafe(owner.last_login_at)
        : null,
  };

  const result: ITodoAppTodo = {
    id: todo.id,
    memberUser: memberUserSummary,
    title: todo.title,
    description:
      todo.description !== null && todo.description !== undefined
        ? todo.description
        : null,
    status: todo.status,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at:
      todo.completed_at !== null && todo.completed_at !== undefined
        ? toISOStringSafe(todo.completed_at)
        : null,
    deleted_at:
      todo.deleted_at !== null && todo.deleted_at !== undefined
        ? toISOStringSafe(todo.deleted_at)
        : null,
  };

  return result;
}
