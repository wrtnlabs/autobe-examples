import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformUserSessions(props: {
  user: UserPayload;
  body: IRedditPlatformUserSession.IRequest;
}): Promise<IRedditPlatformUserSession> {
  const session = await MyGlobal.prisma.reddit_platform_user_sessions.findFirst(
    {
      where: {
        id: props.user.session_id,
        reddit_platform_user_id: props.user.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  const updatedSession =
    await MyGlobal.prisma.reddit_platform_user_sessions.update({
      where: { id: session.id },
      data: {
        last_activity_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updatedSession.id,
    reddit_platform_user_id: updatedSession.reddit_platform_user_id,
    access_token: updatedSession.access_token,
    refresh_token: updatedSession.refresh_token,
    access_token_expires_at: toISOStringSafe(
      updatedSession.access_token_expires_at,
    ),
    refresh_token_expires_at: toISOStringSafe(
      updatedSession.refresh_token_expires_at,
    ),
    ip: updatedSession.ip,
    user_agent: updatedSession.user_agent,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at: toISOStringSafe(updatedSession.expired_at),
    last_activity_at: toISOStringSafe(updatedSession.last_activity_at),
    is_active: updatedSession.is_active,
  };
}
