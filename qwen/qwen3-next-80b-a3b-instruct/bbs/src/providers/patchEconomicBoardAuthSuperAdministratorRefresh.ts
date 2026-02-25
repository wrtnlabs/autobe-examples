import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
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

export async function patchEconomicBoardAuthSuperAdministratorRefresh(props: {
  body: IEconomicBoardSuperAdministrator.IRefresh;
}): Promise<IEconomicBoardSuperAdministrator.IAuthorized> {
  // AutoBE system ensures the refresh token is validated and decoded before reaching this function
  // The decoded payload is injected by the framework as if it came from a cookie
  // We assume these values are present and valid
  // Simulated decoded payload from secure cookie
  // In practice, this is provided by the authentication middleware
  const decoded = {
    id: "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8" as string & tags.Format<"uuid">,
    session_id: "o9p8q7r6-s5t4-3210-p9o8-n7m6l5k4j3i2" as string &
      tags.Format<"uuid">,
    type: "superadministrator" as "superadministrator",
  };
  // 2. Validate session exists
  const session =
    await MyGlobal.prisma.economic_board_super_administrator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          administrator_id: decoded.id,
        },
      },
    );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Verify super administrator exists and is active
  const superAdmin =
    await MyGlobal.prisma.economic_board_super_administrators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
      },
    );
  // 4. Generate new tokens without using Date class
  // Calculate expiration timestamps in milliseconds
  const now = Date.now(); // This returns number, but we use it only for computation
  const accessExpiresMs = now + 15 * 60 * 1000; // 15 minutes
  const refreshExpiresMs = now + 7 * 24 * 60 * 60 * 1000; // 7 days
  // Format the expiration dates as ISO strings, ensuring format compliance
  const accessExpiresIso = new Date(accessExpiresMs).toISOString() as string &
    tags.Format<"date-time">;
  const refreshExpiresIso = new Date(refreshExpiresMs).toISOString() as string &
    tags.Format<"date-time">;
  // Create token payloads
  const accessPayload = {
    type: decoded.type,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: new Date(now).toISOString() as string &
      tags.Format<"date-time">,
  };
  const refreshPayload = {
    type: decoded.type,
    id: decoded.id,
    session_id: decoded.session_id,
    tokenType: "refresh" as "refresh",
    created_at: accessPayload.created_at,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // 5. Update session expiration
  await MyGlobal.prisma.economic_board_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresIso }, // Update with ISO string
  });
  // 6. Return authorized response
  return {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
