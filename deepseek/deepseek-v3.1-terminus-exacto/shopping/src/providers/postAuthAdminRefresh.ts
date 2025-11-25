import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IShoppingMallAdministrator.IRefresh;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  // Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "admin";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate type matches expected actor type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_administrator_id: decoded.id,
        OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
      },
      include: {
        administrator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Check administrator account status
  if (session.administrator.status !== "active") {
    throw new HttpException("Administrator account is not active", 403);
  }

  if (session.administrator.deleted_at !== null) {
    throw new HttpException("Administrator account has been deleted", 403);
  }

  // Generate new tokens with same session ID
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update session expiration time
  await MyGlobal.prisma.shopping_mall_administrator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return authorized response with proper typing
  return {
    id: session.administrator.id,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
    administrator: {
      id: session.administrator.id,
      name: `${session.administrator.first_name} ${session.administrator.last_name}`,
      email: session.administrator.email,
      role: session.administrator.role,
    },
  };
}
