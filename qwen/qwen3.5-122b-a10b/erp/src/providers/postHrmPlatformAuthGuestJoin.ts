import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthGuestJoin(props: {
  ip: string;
  body: IHrmPlatformGuest.IJoin;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.hrm_platform_guests.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create guest record with hashed password
  const guestId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const guest = await MyGlobal.prisma.hrm_platform_guests.create({
    data: {
      id: guestId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create guest session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: sessionId,
      hrm_platform_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized
  return {
    id: guest.id,
    token,
  } satisfies IHrmPlatformGuest.IAuthorized;
}
