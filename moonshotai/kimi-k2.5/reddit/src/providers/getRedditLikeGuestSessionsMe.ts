import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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

export async function getRedditLikeGuestSessionsMe(props: {
  guest: GuestPayload;
}): Promise<IRedditLikeMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_like_guest_sessions.findUniqueOrThrow({
      where: { id: props.guest.session_id },
      select: {
        id: true,
        reddit_like_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const guest = await MyGlobal.prisma.reddit_like_guests.findUniqueOrThrow({
    where: { id: props.guest.id },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const sessionCount = await MyGlobal.prisma.reddit_like_guest_sessions.count({
    where: { reddit_like_guest_id: props.guest.id },
  });
  return {
    id: session.id,
    actorType: "guest",
    actor: {
      id: guest.id,
      device_fingerprint: guest.device_fingerprint,
      created_at: guest.created_at.toISOString(),
      updated_at: guest.updated_at.toISOString(),
      deleted_at: guest.deleted_at?.toISOString() ?? null,
      session_count: sessionCount,
    } satisfies IRedditLikeGuest.ISummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    userAgent: null,
    createdAt: session.created_at.toISOString(),
    expiredAt: session.expired_at.toISOString(),
    expiresAt: session.expired_at.toISOString(),
  };
}
