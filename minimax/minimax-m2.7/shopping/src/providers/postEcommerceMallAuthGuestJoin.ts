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
  // 1. Check if guest with fingerprint already exists
  const existingGuest = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
    where: {
      fingerprint: props.body.fingerprint,
      deleted_at: null,
    },
  });
  // 2. Create new guest record if not exists
  const guest = existingGuest
    ? existingGuest
    : await MyGlobal.prisma.ecommerce_mall_guests.create({
        data: {
          id: v4(),
          fingerprint: props.body.fingerprint,
          ip_address: props.body.ip ?? props.ip,
          user_agent: props.body.user_agent ?? null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
  // 3. Update last_active_at for existing guest
  if (existingGuest) {
    await MyGlobal.prisma.ecommerce_mall_guests.update({
      where: { id: guest.id },
      data: {
        last_active_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // 4. Create session with expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const now = new Date().toISOString();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return IAuthorized response
  return {
    id: guest.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
