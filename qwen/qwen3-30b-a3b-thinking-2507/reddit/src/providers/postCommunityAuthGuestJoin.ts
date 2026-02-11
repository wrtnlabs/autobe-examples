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
  body: ICommunityGuest.IJoin;
}): Promise<ICommunityGuest.IAuthorized> {
  const { email, password, username } = props.body;
  // Generate unique device_id (pattern: guest:email:uuid)
  const device_id = `guest:${email}:${v4()}`;
  // Check for existing device_id collision
  const existing = await MyGlobal.prisma.community_guests.findFirst({
    where: { device_id },
  });
  if (existing) throw new HttpException("Device ID already exists", 409);
  // Create guest record (schema has no email/username, only device_id)
  const guest = await MyGlobal.prisma.community_guests.create({
    data: {
      id: v4(),
      device_id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Generate 15m access and 7d refresh tokens
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: guest.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: guest.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: guest.id,
    token,
  } satisfies ICommunityGuest.IAuthorized;
}
