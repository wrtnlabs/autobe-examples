import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersSelfSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Locate the session with this id and belonging to this user only
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.user.id,
    },
  });

  // Step 2: If session not found, simply return (do not reveal existence of others)
  if (!session) return;

  // Step 3: Set expired_at to current time (no Date usage in type)
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: {
      id: props.sessionId,
    },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });

  // Step 4: Return void
  return;
}
