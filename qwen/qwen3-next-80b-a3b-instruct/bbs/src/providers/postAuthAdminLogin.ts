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

export async function postAuthAdminLogin(props: {
  body: IEconomicBoardAdmin.ILogin;
}): Promise<IEconomicBoardAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Find admin by email
  const admin = await MyGlobal.prisma.economic_board_admin.findUniqueOrThrow({
    where: { email },
  });

  // Check if admin is active
  if (!admin.is_active) {
    throw new HttpException("Unauthorized", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(password, admin.password_hash);
  if (!isValid) {
    throw new HttpException("Unauthorized", 401);
  }

  // Generate new UUID for auth_jwt_id
  const newAuthJwtId = v4() as string & tags.Format<"uuid">;

  // Get current time as ISO string
  const now = toISOStringSafe(new Date());

  // Generate token expiration times as ISO strings
  const expiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  const refreshableUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now

  // Generate JWT access token - minimal payload with only userId
  const accessToken = jwt.sign(
    {
      userId: admin.id,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      userId: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update admin record with new auth_jwt_id and last_login
  await MyGlobal.prisma.economic_board_admin.update({
    where: { email },
    data: {
      last_login: now,
      auth_jwt_id: newAuthJwtId,
    },
  });

  // Return response with all required fields
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    last_login: now,
    is_active: admin.is_active,
    auth_jwt_id: newAuthJwtId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt as string & tags.Format<"date-time">,
      refreshable_until: refreshableUntil as string & tags.Format<"date-time">,
    },
  } satisfies IEconomicBoardAdmin.IAuthorized;
}
