import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { body } = props;

  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      user_type: "admin",
      is_revoked: false,
    },
  });

  if (!session) {
    throw new HttpException("Invalid or revoked refresh token", 401);
  }

  try {
    jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new HttpException("Invalid token signature", 401);
  }

  const nowTimestamp = Date.now();
  const expiresAtTimestamp = new Date(
    session.refresh_token_expires_at,
  ).getTime();

  if (nowTimestamp > expiresAtTimestamp) {
    throw new HttpException("Refresh token expired", 401);
  }

  const lastActivityTimestamp = new Date(session.last_activity_at).getTime();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

  if (nowTimestamp - lastActivityTimestamp > thirtyDaysInMs) {
    throw new HttpException("Session expired due to inactivity", 401);
  }

  if (!session.admin_id) {
    throw new HttpException("Invalid session: no admin associated", 401);
  }

  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: session.admin_id },
  });

  if (!admin) {
    throw new HttpException("Admin account not found", 401);
  }

  if (!admin.is_active) {
    throw new HttpException("Admin account is not active", 401);
  }

  const accessTokenExpiryTimestamp = nowTimestamp + 30 * 60 * 1000;
  const accessTokenExpiry = toISOStringSafe(
    new Date(accessTokenExpiryTimestamp),
  );

  const accessToken = jwt.sign(
    {
      userId: admin.id,
      email: admin.email,
      role: "admin",
      role_level: admin.role_level,
      type: "access",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const timeUntilExpiry = expiresAtTimestamp - nowTimestamp;

  let newRefreshToken = body.refresh_token;
  let refreshableUntil = toISOStringSafe(session.refresh_token_expires_at);

  if (timeUntilExpiry <= sevenDaysInMs) {
    const refreshTokenExpiryTimestamp = nowTimestamp + 30 * 24 * 60 * 60 * 1000;
    refreshableUntil = toISOStringSafe(new Date(refreshTokenExpiryTimestamp));

    newRefreshToken = jwt.sign(
      {
        userId: admin.id,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d",
        issuer: "autobe",
      },
    );

    await MyGlobal.prisma.shopping_mall_sessions.update({
      where: { id: session.id },
      data: {
        refresh_token: newRefreshToken,
        refresh_token_expires_at: refreshableUntil,
        last_activity_at: toISOStringSafe(new Date(nowTimestamp)),
      },
    });
  } else {
    await MyGlobal.prisma.shopping_mall_sessions.update({
      where: { id: session.id },
      data: {
        last_activity_at: toISOStringSafe(new Date(nowTimestamp)),
      },
    });
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role_level: admin.role_level,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshableUntil,
    },
  };
}
