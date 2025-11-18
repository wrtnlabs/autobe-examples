import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodolistmemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmemberSession";
import { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";
import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function getTodoListTodoListMemberActorsMeSessionsSessionId(props: {
  todoListMember: TodolistmemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodolistmemberSession> {
  const session =
    await MyGlobal.prisma.todo_list_todolistmember_sessions.findFirst({
      where: {
        id: props.sessionId,
        todo_list_todolistmember_id: props.todoListMember.id,
      },
    });

  if (!session) {
    throw new HttpException(
      "Session not found or does not belong to the current user.",
      404,
    );
  }

  const member = await MyGlobal.prisma.todo_list_todolistmembers.findUnique({
    where: { id: session.todo_list_todolistmember_id },
  });

  if (!member) {
    throw new HttpException("Session owner not found.", 404);
  }

  return {
    id: session.id,
    member: {
      id: member.id,
      email: member.email,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
