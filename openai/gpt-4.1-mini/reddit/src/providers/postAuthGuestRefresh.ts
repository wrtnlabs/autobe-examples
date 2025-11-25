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

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IRedditCommunityGuest.IRefresh;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        redditCommunityGuest: {
          id: decoded.id,
          deleted_at: null,
        },
        expired_at: {
          gt: new Date(),
        },
      },
      include: {
        redditCommunityGuest: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const guest = session.redditCommunityGuest;
  if (!guest) {
    throw new HttpException("Guest user not found", 401);
  }

  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const nowISO = toISOStringSafe(new Date());
  const accessExpiresISO = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresISO = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresISO },
  });

  return {
    id: guest.id as string & tags.Format<"uuid">,
    ip: undefined,
    href: session.href,
    referrer: session.referrer,
    session_id: decoded.session_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(guest.created_at),
    updated_at:
      guest.updated_at === null ? undefined : toISOStringSafe(guest.updated_at),
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  };
}
