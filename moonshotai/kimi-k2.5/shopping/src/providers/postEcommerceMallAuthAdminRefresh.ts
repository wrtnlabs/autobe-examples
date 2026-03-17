import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthAdminRefresh(props: {
  body: IEcommerceMallAdmin.IRefresh;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not expired
  const now = new Date();
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
        expired_at: { gt: now },
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin account exists and is active
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id },
    ...EcommerceMallAdminTransformer.select(),
  });
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // 5. Generate new tokens (same session_id)
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Transform admin data and return
  const transformedAdmin = await EcommerceMallAdminTransformer.transform(admin);
  return {
    id: transformedAdmin.id as string & tags.Format<"uuid">,
    email: transformedAdmin.email as string & tags.Format<"email">,
    grade: transformedAdmin.grade,
    status: transformedAdmin.status,
    nickname: transformedAdmin.nickname,
    created_at: transformedAdmin.created_at as string &
      tags.Format<"date-time">,
    updated_at: transformedAdmin.updated_at as string &
      tags.Format<"date-time">,
    deleted_at: transformedAdmin.deleted_at as
      | (string & tags.Format<"date-time">)
      | null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
