import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformGuestSessionTransformer } from "../transformers/CommunityPlatformGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string;
}): Promise<ICommunityPlatformGuestSession> {
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findUnique({
      where: { token: props.sessionId },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Compare expired_at (ISO string) with current time (ISO string)
  const now = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(session.expired_at);
  if (expiredAt <= now) {
    throw new HttpException("Session has expired", 401);
  }
  const guest = await MyGlobal.prisma.community_platform_guests.findUnique({
    where: { id: session.community_platform_guest_id },
  });
  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }
  const transformedSession = {
    ...session,
    guest: {
      id: guest.id,
      created_at: guest.created_at,
      updated_at: guest.updated_at,
      deleted_at: guest.deleted_at,
      device_hash: guest.device_hash,
    },
  };
  return await CommunityPlatformGuestSessionTransformer.transform(
    transformedSession,
  );
}
