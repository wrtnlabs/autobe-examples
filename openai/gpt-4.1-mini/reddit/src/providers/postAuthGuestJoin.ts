import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IRedditCommunityGuest.ICreate;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const now = toISOStringSafe(new Date());
  const guestId = v4() as string & tags.Format<"uuid">;

  const createdGuest = await MyGlobal.prisma.reddit_community_guest.create({
    data: {
      id: guestId,
      created_at: now,
    },
  });

  const accessExpireMillis = 60 * 60 * 1000;
  const refreshExpireMillis = 7 * 24 * 60 * 60 * 1000;
  const accessExpiry = toISOStringSafe(
    new Date(Date.now() + accessExpireMillis),
  );
  const refreshExpiry = toISOStringSafe(
    new Date(Date.now() + refreshExpireMillis),
  );

  const sessionId = v4() as string & tags.Format<"uuid">;

  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_community_guest_id: createdGuest.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpiry,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: createdGuest.id,
        session_id: session.id,
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
        id: createdGuest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiry,
    refreshable_until: refreshExpiry,
  };

  return {
    id: createdGuest.id,
    created_at: toISOStringSafe(new Date(createdGuest.created_at)),
    reddit_community_guest_sessions: [
      {
        id: session.id,
        reddit_community_guest_id: createdGuest.id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: toISOStringSafe(new Date(session.created_at)),
        expired_at:
          session.expired_at === null
            ? null
            : toISOStringSafe(new Date(session.expired_at)),
      },
    ],
    token,
  };
}
