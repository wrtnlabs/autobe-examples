import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditAuthGuestJoin(props: {
  body: IRedditGuest.IJoin;
}): Promise<IRedditGuest.IAuthorized> {
  const existingGuest = await MyGlobal.prisma.reddit_guests.findFirst({
    where: { device_id: props.body.device_id },
  });
  const guest =
    existingGuest ||
    (await MyGlobal.prisma.reddit_guests.create({
      data: {
        device_id: props.body.device_id,
      },
    }));
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.reddit_guest_sessions.create({
    data: {
      id: v4(),
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      reddit_guest_id: guest.id,
      ip: props.body.ip ?? "",
      expired_at: accessExpires,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    token,
  };
}
