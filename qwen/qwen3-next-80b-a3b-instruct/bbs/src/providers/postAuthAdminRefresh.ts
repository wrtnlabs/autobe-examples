import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IEconomicBoardAdmin.IRefresh;
}): Promise<IEconomicBoardAdmin.IAuthorized> {
  const { refresh_token } = props.body;

  // Verify refresh token signature and extract userId
  let decoded: any;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate that decoded token contains userId
  if (!decoded || !decoded.userId) {
    throw new HttpException("Invalid refresh token payload", 401);
  }

  // Find admin by userId
  const admin = await MyGlobal.prisma.economic_board_admin.findUnique({
    where: { id: decoded.userId },
  });

  if (!admin || !admin.is_active) {
    throw new HttpException("Admin account not found or inactive", 401);
  }

  // Update admin record with new refresh token (auth_jwt_id)
  const newRefreshToken = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.economic_board_admin.update({
    where: { id: admin.id },
    data: {
      auth_jwt_id: newRefreshToken,
      last_login: now,
    },
  });

  // Generate new access token
  const newAccessToken = jwt.sign(
    {
      userId: admin.id,
      email: admin.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate expiration timestamps
  const newAccessTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour from now
  const newRefreshTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ); // 30 days from now

  // Return new authorization data
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    last_login: now,
    is_active: admin.is_active,
    auth_jwt_id: newRefreshToken,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: newAccessTokenExpiresAt,
      refreshable_until: newRefreshTokenExpiresAt,
    },
  };
}
