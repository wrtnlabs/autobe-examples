import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const result =
    await MyGlobal.prisma.discussion_board_user_sessions.deleteMany({
      where: {
        id: props.sessionId,
        user_id: props.userId,
      },
    });

  if (result.count === 0) {
    throw new HttpException("Session not found for the specified user.", 404);
  }

  // Optionally, this is where audit logging would occur per security standards.
  return;
}
