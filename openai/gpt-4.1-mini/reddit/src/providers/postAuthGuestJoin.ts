import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const createdGuest = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpiresTimestamp = Date.now() + 60 * 60 * 1000;
  const refreshExpiresTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;

  // Use toISOStringSafe instead of direct toISOString()
  const accessExpires = toISOStringSafe(
    new Date(accessExpiresTimestamp),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(refreshExpiresTimestamp),
  ) as string & tags.Format<"date-time">;

  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_community_guest_id: id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: createdGuest.id,
    ip: props.body.ip ?? null,
    href: session.href,
    referrer: session.referrer,
    session_id: session.id,
    created_at: toISOStringSafe(createdGuest.created_at),
    updated_at:
      createdGuest.updated_at !== null && createdGuest.updated_at !== undefined
        ? toISOStringSafe(createdGuest.updated_at)
        : null,
    token,
  };
}
