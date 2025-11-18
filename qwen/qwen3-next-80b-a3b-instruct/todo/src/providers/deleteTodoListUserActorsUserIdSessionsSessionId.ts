import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserActorsUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify ownership: authenticated user must match target user
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden: user mismatch", 403);
  }

  // Delete the session record with dual validation: session ID and user ID
  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.user.id,
    },
  });
}
