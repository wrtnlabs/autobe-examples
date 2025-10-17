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

export async function postAuthAdminJoin(props: {
  body: IEconomicBoardAdmin.IJoin;
}): Promise<IEconomicBoardAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Generate new admin ID
  const id = v4() as string & tags.Format<"uuid">;

  // Hash password using PasswordUtil
  const password_hash = await PasswordUtil.hash(password);

  // Set current UTC time for created_at and last_login
  const now = toISOStringSafe(new Date());

  // Create new admin record
  const created = await MyGlobal.prisma.economic_board_admin.create({
    data: {
      id,
      email,
      password_hash,
      created_at: now,
      last_login: now,
      is_active: true,
      auth_jwt_id: v4(),
    },
  });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
      type: "admin",
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
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Construct token object with expiration dates
  const expired_at = toISOStringSafe(new Date(Date.now() + 3600000)); // 1 hour from now
  const refreshable_until = toISOStringSafe(new Date(Date.now() + 604800000)); // 7 days from now

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at,
    refreshable_until,
  } satisfies IAuthorizationToken;

  // Return complete authorized response
  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    last_login: toISOStringSafe(created.last_login),
    is_active: created.is_active,
    auth_jwt_id: created.auth_jwt_id,
    token,
  };
}
