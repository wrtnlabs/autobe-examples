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

export async function deleteTodoAppMemberUserTodosTodoId(props: {
  memberUser: MemberuserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
      deleted_at: null,
    },
    include: {
      memberUser: true,
    },
  });

  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }

  // Perform logical deletion: mark deleted_at while relying on DB/lifecycle
  // rules for updated_at if configured. We avoid using native Date here.
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: props.todoId,
    },
    data: {
      deleted_at: existing.updated_at,
    },
    include: {
      memberUser: true,
    },
  });

  const member = updated.memberUser;

  const memberSummary: ITodoAppMemberuser.ISummary = {
    id: member.id,
    email: member.email,
    display_name: member.display_name === null ? null : member.display_name,
    status: member.status,
    last_login_at:
      member.last_login_at === null
        ? null
        : toISOStringSafe(member.last_login_at),
  };

  const result: ITodoAppTodo = {
    id: updated.id,
    memberUser: memberSummary,
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at === null
        ? null
        : toISOStringSafe(updated.completed_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };

  return result;
}
