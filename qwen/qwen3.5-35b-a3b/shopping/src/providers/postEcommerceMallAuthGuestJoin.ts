import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
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

export async function postEcommerceMallAuthGuestJoin(props: {
  ip: string;
  body: IEcommerceMallGuest.IJoin;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create guest actor
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      device_fingerprint: props.body.user_agent ?? "unknown",
      ip: props.body.ip ?? props.ip,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // 3. Create session with JWT tokens
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const token = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  ) as string;
  const refresh_token = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  ) as string;
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: sessionId,
      guest: { connect: { id: guest.id } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: accessExpires,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // 4. Return IAuthorized
  return {
    id: guest.id,
    token: {
      access: token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceMallGuest.IAuthorized;
}
