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
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const id = v4();
  const now = toISOStringSafe(new Date());
  const guest = await MyGlobal.prisma.community_platform_guests.create({
    data: {
      id,
      device_fingerprint: "",
      created_at: now,
      updated_at: now,
    },
  });
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: guest.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: guest.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    token,
  };
}
