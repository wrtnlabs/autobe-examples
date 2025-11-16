import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityRegisteredUsersIdRegisteredUserSessionsSessionId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (session === null) {
    throw new HttpException("Session not found", 404);
  }

  if (session.reddit_community_registered_user_id !== props.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (props.registeredUser.id !== props.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_registered_user_sessions.delete({
    where: { id: props.sessionId },
  });
}
