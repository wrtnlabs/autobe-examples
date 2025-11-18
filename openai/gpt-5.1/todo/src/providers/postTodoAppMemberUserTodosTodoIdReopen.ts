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

export async function postTodoAppMemberUserTodosTodoIdReopen(props: {
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
      memberUser: {
        select: {
          id: true,
          email: true,
          display_name: true,
          status: true,
          last_login_at: true,
        },
      },
    },
  });

  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }

  const currentStatus = existing.status;
  const reopenedStatus =
    currentStatus === "completed" ? "pending" : currentStatus;

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: existing.id,
    },
    data: {
      status: reopenedStatus,
      completed_at: null,
    },
    include: {
      memberUser: {
        select: {
          id: true,
          email: true,
          display_name: true,
          status: true,
          last_login_at: true,
        },
      },
    },
  });

  const memberUserSummary: ITodoAppMemberuser.ISummary = {
    id: updated.memberUser.id,
    email: updated.memberUser.email,
    display_name:
      updated.memberUser.display_name === null
        ? null
        : updated.memberUser.display_name,
    status: updated.memberUser.status,
    last_login_at:
      updated.memberUser.last_login_at === null
        ? null
        : toISOStringSafe(updated.memberUser.last_login_at),
  };

  return {
    id: updated.id,
    memberUser: memberUserSummary,
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
}
