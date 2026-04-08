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
import { EcommerceMallGuestTransformer } from "../transformers/EcommerceMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthGuestJoin(props: {
  ip: string;
  body: IEcommerceMallGuest.IJoin;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  const now = Date.now();
  const accessExpires = new Date(now + 15 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.create({
    data: {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_mall_guestsCreateInput,
    ...EcommerceMallGuestTransformer.select(),
  });
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: v4(),
      ecommerceMallGuest: {
        connect: {
          id: guest.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: refreshExpires,
    } satisfies Prisma.ecommerce_mall_guest_sessionsCreateInput,
  });
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date(now)),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date(now)),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await EcommerceMallGuestTransformer.transform(guest)),
    token,
  } satisfies IEcommerceMallGuest.IAuthorized;
}
