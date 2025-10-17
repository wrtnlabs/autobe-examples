import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IDiscussionBoardAdmin.ILogin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Find admin by email (case-insensitive), only active accounts (deleted_at IS NULL)
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      email: email,
      deleted_at: null,
    },
  });

  // Not found or soft-deleted
  if (!admin) throw new HttpException("Invalid email or password", 401);

  // Must be email_verified to login
  if (admin.email_verified !== true)
    throw new HttpException("Email verification required.", 401);

  // Validate password
  const valid = await PasswordUtil.verify(password, admin.password_hash);
  if (!valid) throw new HttpException("Invalid email or password", 401);

  // Generate JWTs
  const now = Date.now();
  const accessTokenExpires = new Date(now + 60 * 60 * 1000); // 1 hour
  const refreshTokenExpires = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days

  const access = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    email_verified: admin.email_verified,
    registration_completed_at: toISOStringSafe(admin.registration_completed_at),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessTokenExpires),
      refreshable_until: toISOStringSafe(refreshTokenExpires),
    },
  };
}
