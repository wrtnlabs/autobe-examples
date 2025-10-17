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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { admin, body } = props;

  // Check if email already exists
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: body.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Generate UUIDs and tokens
  const newAdminId = v4() as string & tags.Format<"uuid">;
  const emailVerificationToken = v4();

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create the new admin account
  await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: newAdminId,
      created_by_admin_id: admin.id,
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      role_level: body.role_level,
      is_active: true,
      email_verified: false,
      email_verification_token: emailVerificationToken,
      email_verification_sent_at: now,
      mfa_enabled: false,
      mfa_secret: null,
      last_login_at: null,
      last_login_ip: null,
      password_reset_token: null,
      password_reset_expires_at: null,
      failed_login_attempts: 0,
      failed_login_window_start_at: null,
      account_locked_until: null,
      password_changed_at: now,
      password_history: "[]",
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT tokens
  const accessTokenExpiration = new Date();
  accessTokenExpiration.setHours(accessTokenExpiration.getHours() + 1);
  const accessTokenExpiresAt = toISOStringSafe(accessTokenExpiration);

  const refreshTokenExpiration = new Date();
  refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 7);
  const refreshTokenExpiresAt = toISOStringSafe(refreshTokenExpiration);

  const accessToken = jwt.sign(
    {
      id: newAdminId,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: newAdminId,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized admin response
  return {
    id: newAdminId,
    email: body.email,
    name: body.name,
    role_level: body.role_level,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiresAt,
      refreshable_until: refreshTokenExpiresAt,
    },
  };
}
