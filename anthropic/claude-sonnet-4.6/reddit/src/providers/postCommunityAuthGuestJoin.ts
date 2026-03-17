import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
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

export async function postCommunityAuthGuestJoin(props: {
  ip: string;
  body: ICommunityGuest.IJoin;
}): Promise<ICommunityGuest.IAuthorized> {
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 1. Upsert guest record by fingerprint (unique constraint)
  const guest = await MyGlobal.prisma.community_guests.upsert({
    where: { fingerprint: props.body.fingerprint },
    create: {
      id: v4(),
      fingerprint: props.body.fingerprint,
      created_at: now,
      updated_at: now,
    },
    update: {
      updated_at: now,
    },
    select: {
      id: true,
      fingerprint: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 2. Create a new guest session record (append-only, never updated)
  const session = await MyGlobal.prisma.community_guest_sessions.create({
    data: {
      id: v4(),
      guest: { connect: { id: guest.id } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
    select: {
      id: true,
    },
  });
  // 3. Generate JWT tokens (payload matches GuestPayload)
  const tokenCreatedAt = now.toISOString();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 4. Assemble and return ICommunityGuest.IAuthorized
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies ICommunityGuest.IAuthorized;
}
