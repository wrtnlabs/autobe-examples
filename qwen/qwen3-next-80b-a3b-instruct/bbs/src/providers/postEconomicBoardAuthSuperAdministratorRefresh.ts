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

export async function postEconomicBoardAuthSuperAdministratorRefresh(props: {
  body: IEconomicBoardSuperAdministrator.IRefresh;
}): Promise<IEconomicBoardSuperAdministrator.IAuthorized> {
  // Extract the decoded refresh token payload from the system-injected user context
  const user = MyGlobal.user;
  // Validate user context exists and has required properties
  if (
    !user ||
    !user.id ||
    !user.session_id ||
    user.type !== "superadministrator"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.economic_board_super_administrator_sessions.findFirst(
      {
        where: {
          id: user.session_id,
          super_administrator_id: user.id,
        },
      },
    );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Generate new tokens (SAME session_id)
  const now = new Date();
  const accessExpires = toISOStringSafe(
    new Date(now.getTime() + 15 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: user.type,
        id: user.id,
        session_id: user.session_id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "15m",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: user.type,
        id: user.id,
        session_id: user.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "14d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return new tokens
  return {
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
