import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IShoppingMallAdministrator.ILogin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  // Find administrator by email
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: { email: props.body.email },
    });

  if (!administrator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account status
  if (administrator.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Calculate expiration times using string timestamps
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);

  // Create new session
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_administrator_id: administrator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date(now)),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: administrator.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date(now)),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date(now)),
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

  // Return authentication response
  return {
    id: administrator.id,
    token,
    administrator: {
      id: administrator.id,
      name: `${administrator.first_name} ${administrator.last_name}`,
      email: administrator.email,
      role: administrator.role,
    },
  };
}
