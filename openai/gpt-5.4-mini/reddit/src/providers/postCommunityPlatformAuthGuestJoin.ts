import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthGuestJoin(props: {
  ip: string;
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const guestId = v4();
  const sessionId = v4();
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 1000 * 60 * 60),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 1000 * 60 * 60 * 24 * 30),
  );
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const guest = await tx.community_platform_guests.create({
      data: {
        id: guestId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const session = await tx.community_platform_guest_sessions.create({
      data: {
        id: sessionId,
        community_platform_guest_id: guest.id,
        ip: props.ip,
        href: "/communityPlatform/auth/guest/join",
        referrer: "",
        created_at: now,
        expired_at: refreshableUntil,
      },
    });
    return {
      guest,
      session,
    };
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: created.guest.id,
        session_id: created.session.id,
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
        id: created.guest.id,
        session_id: created.session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: created.guest.id,
    token,
  };
}
