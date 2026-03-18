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

export async function postHrmPlatformAuthGuestRefresh(props: {
  body: IHrmPlatformGuest.IRefresh;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
    created_at: string;
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "guest";
      created_at: string;
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrm_platform_guest_id: decoded.id,
      expired_at: {
        gte: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest exists and is not deleted
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest) {
    throw new HttpException("Guest account not found", 404);
  }
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.hrm_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  // 7. Return authorized response
  const result: IHrmPlatformGuest.IAuthorized = {
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
  return typia.assert<IHrmPlatformGuest.IAuthorized>(result);
}
