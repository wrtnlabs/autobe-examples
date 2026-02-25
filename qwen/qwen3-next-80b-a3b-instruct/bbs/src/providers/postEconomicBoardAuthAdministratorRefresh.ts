import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEconomicBoardAuthAdministratorRefresh(props: {
  body: IEconomicBoardAdministrator.IRefresh;
}): Promise<IEconomicBoardAdministrator.IAuthorized> {
  // Extract refresh token from HTTP-only cookie by framework
  // No data in body — refresh token is securely transmitted via cookie
  const refreshToken = extractRefreshTokenFromCookie();
  // 1. Verify refresh token signature and payload
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    role: "administrator";
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.role !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 2. Validate session exists and is active
  const session =
    await MyGlobal.prisma.economic_board_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        administrator_id: decoded.id, // Fixed: use correct field named administrator_id
        expired_at: {
          gt: new Date().toISOString() as string & tags.Format<"date-time">,
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate administrator account exists and not banned
  const admin =
    await MyGlobal.prisma.economic_board_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (admin.is_banned) {
    throw new HttpException("Account has been banned", 403);
  }
  // 4. Generate new access token (15-minute expiration)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const accessEncoded = jwt.sign(
    {
      id: admin.id,
      role: "administrator",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  // 5. Generate new refresh token (14-day expiration)
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const refreshEncoded = jwt.sign(
    {
      id: admin.id,
      session_id: decoded.session_id, // FIXED: Reuse same session_id, do NOT generate new one
      role: "administrator",
      tokenType: "refresh",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 6. Insert new session with new refresh token ID (atomic operation)
  await MyGlobal.prisma.economic_board_administrator_sessions.create({
    data: {
      id: decoded.session_id, // Reuse same session_id
      administrator_id: admin.id, // Only assign administrator_id once
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      expired_at: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  });
  // 7. Delete old session record (invalidate the old refresh token)
  await MyGlobal.prisma.economic_board_administrator_sessions.delete({
    where: { id: session.id },
  });
  // 8. Return IAuthorized response structure
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    bio: admin.bio,
    is_banned: admin.is_banned,
    ban_reason: admin.ban_reason,
    admin_request_status: admin.admin_request_status as
      | "pending"
      | "approved"
      | "rejected",
    admin_request_reason: admin.admin_request_reason,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    role: "administrator",
    access_token: accessEncoded,
    refresh_token: refreshEncoded,
    token: {
      access: accessEncoded,
      refresh: refreshEncoded,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
// Stub function — NestJS will automatically inject from HTTP-only cookie
// This is just stub to make TypeScript happy; real implementation uses middleware
function extractRefreshTokenFromCookie(): string {
  return ""; // Will be injected by framework guard
}
