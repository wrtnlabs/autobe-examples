import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteDiscussionBoardRegisteredUserRegisteredUsersUserIdSessionsSessionId(props: {
  registeredUser: RegisteredUserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const userExists =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.userId },
    });

  if (!userExists) {
    throw new HttpException("User not found", 404);
  }

  const sessionExists =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findFirst({
      where: {
        id: props.sessionId,
      },
    });

  if (!sessionExists) {
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.discussion_board_registered_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
