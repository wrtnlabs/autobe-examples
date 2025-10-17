import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // Generate a new guest ID
  const guestId: string & tags.Format<"uuid"> = v4();

  // Create the guest record in the database
  await MyGlobal.prisma.community_platform_guest.create({
    data: {
      id: guestId,
      created_at: toISOStringSafe(new Date()),
      ip_address: null,
      user_agent: null,
      last_active: toISOStringSafe(new Date()),
    },
  });

  // Generate JWT tokens
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const accessToken = jwt.sign(
    {
      id: guestId,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: guestId,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "24h",
      issuer: "autobe",
    },
  );

  // Return the authorized response structure
  return {
    id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
