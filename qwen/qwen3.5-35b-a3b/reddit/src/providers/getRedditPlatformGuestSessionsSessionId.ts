import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformGuestSession> {
  const session =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
    });
  if (session.reddit_platform_guest_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: session.id,
    reddit_platform_guest_id: session.reddit_platform_guest_id,
    ip: session.ip,
    referrer: session.referrer,
    href: session.href,
    created_at: session.created_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
  };
}
