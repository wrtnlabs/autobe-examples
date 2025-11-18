import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TodolistmemberPayload } from "../../decorators/payload/TodolistmemberPayload";

export async function todolistmemberAuthorize(request: {
  headers: { authorization?: string }
}): Promise<TodolistmemberPayload> {
  const payload: TodolistmemberPayload = jwtAuthorize({ request }) as TodolistmemberPayload;
  if (payload.type !== "todolistmember")
    throw new ForbiddenException(`You're not ${payload.type}`);
  const session = await MyGlobal.prisma.todo_list_todolistmember_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_todolistmember_id: payload.id,
      expired_at: null,
    },
  });
  if (session === null)
    throw new ForbiddenException("You're not enrolled or session is invalidated");
  return payload;
}
