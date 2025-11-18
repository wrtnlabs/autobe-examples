import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function deleteTodoListTodoListMemberActorsMeSessionsSessionId(props: {
  todoListMember: TodolistmemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.todo_list_todolistmember_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_todolistmember_id !== props.todoListMember.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.todo_list_todolistmember_sessions.delete({
    where: { id: props.sessionId },
  });
}
