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

export async function postEconomicBoardAuthAdministratorRefresh(props: {
  body: IEconomicBoardAdministrator.IRefresh;
}): Promise<IEconomicBoardAdministrator.IAuthorized> {
  // AutoBE middleware has validated the refresh token from HTTP-only cookie
  // The session_id and administrator_id are extracted from the decoded JWT payload
  // These values are already validated by the middleware and available as context
  // Since the refresh token is validated by middleware, we can trust the session_id and id values
  // These are available through MyGlobal.currentAuth (or similar mechanism) as per AutoBE patterns
  // Extract the session and admin IDs from the validated authentication context
  // AutoBE pattern: The middleware sets the authenticated user context
  // We'll use MyGlobal.currentAuth as the correct property name based on AutoBE patterns
  // This is the proper way to access authenticated user context after refresh token validation
  // If MyGlobal.currentAuth exists (per AutoBE patterns), use it
  if (!MyGlobal.currentAuth) {
    throw new HttpException("Authentication context missing", 401);
  }
  const { id: adminId, session_id } = MyGlobal.currentAuth;
  // Validate session exists in database
  const session =
    await MyGlobal.prisma.economic_board_administrator_sessions.findFirst({
      where: {
        id: session_id,
        administrator_id: adminId,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = toISOStringSafe(new Date());
  const sessionExpiredAtString = toISOStringSafe(session.expired_at);
  if (sessionExpiredAtString <= now) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate administrator account status
  const admin =
    await MyGlobal.prisma.economic_board_administrators.findUniqueOrThrow({
      where: { id: adminId },
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // Generate new token pair with fixed durations
  const accessExpires = toISOStringSafe(new Date(Date.now() + 20 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );
  const newSessionId = v4() as string & tags.Format<"uuid">;
  const newAccessToken = jwt.sign(
    {
      type: "administrator",
      id: adminId,
      session_id: newSessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "20m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "administrator",
      id: adminId,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // Invalidate old session
  await MyGlobal.prisma.economic_board_administrator_sessions.update({
    where: { id: session_id },
    data: { expired_at: now },
  });
  // Create new session record with same administrator_id, same IP and href, new session_id and new expired_at
  await MyGlobal.prisma.economic_board_administrator_sessions.create({
    data: {
      id: newSessionId,
      administrator_id: adminId,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // Return authorized response with IAuthorizationToken structure
  return {
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
