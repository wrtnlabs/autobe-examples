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

export async function patchCommunityPlatformGuestGuestSessions(props: {
  guest: GuestPayload;
  body: ICommunityPlatformGuestSession.IRequest;
}): Promise<ICommunityPlatformGuestSession> {
  const user_agent = "Unknown";
  const ip = "Unknown";
  const href = "";
  const now = new Date();
  const newExpiredAt = toISOStringSafe(new Date(now.getTime() + 3600000));
  const existingSession =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirst({
      where: {
        community_platform_guest_id: props.guest.id,
        expired_at: { gt: toISOStringSafe(now) },
      },
    });
  if (existingSession) {
    await MyGlobal.prisma.community_platform_guest_sessions.update({
      where: { id: existingSession.id },
      data: { expired_at: newExpiredAt },
    });
    return CommunityPlatformGuestSessionTransformer.transform({
      ...existingSession,
      guest: {
        id: existingSession.community_platform_guest_id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        device_hash: "",
      },
    });
  }
  const newSession =
    await MyGlobal.prisma.community_platform_guest_sessions.create({
      data: {
        id: v4(),
        token: v4(),
        community_platform_guest_id: props.guest.id,
        created_at: toISOStringSafe(now),
        expired_at: newExpiredAt,
        user_agent: user_agent,
        ip: ip,
        href: href,
        referrer: href,
      },
    });
  return CommunityPlatformGuestSessionTransformer.transform({
    ...newSession,
    guest: {
      id: props.guest.id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      device_hash: "",
    },
  });
}
