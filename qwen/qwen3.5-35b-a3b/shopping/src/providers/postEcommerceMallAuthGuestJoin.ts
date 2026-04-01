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
  const email = props.body.email;
  if (email) {
    const existing = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
      where: { email },
    });
    if (existing) {
      throw new HttpException("Email already registered", 409);
    }
  }
  const deviceId = v4() as string & tags.Format<"uuid">;
  const deviceFingerprint = `${props.ip}-${props.body.user_agent ?? "unknown"}`;
  const created = await MyGlobal.prisma.ecommerce_mall_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      device_fingerprint: deviceFingerprint,
      ip: props.body.ip ?? props.ip,
      email: email,
      user_agent: props.body.user_agent ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_guest_id: created.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest" as const,
        id: created.id,
        session_id: session.id,
        email: email,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest" as const,
        id: created.id,
        session_id: session.id,
        tokenType: "refresh" as const,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: created.id,
    token,
  } satisfies IEcommerceMallGuest.IAuthorized;
}
