import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as any;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find session by session_id and admin_id
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_admin_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session not expired
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Check 30-minute inactivity window
  const now = Date.now();
  const lastActivity = session.last_activity_at.getTime();
  const inactivityWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
  if (now - lastActivity > inactivityWindow) {
    throw new HttpException("Session expired due to inactivity", 401);
  }
  // 6. Validate admin exists and is active
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // 7. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new token hashes and reset last_activity_at
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token_hash: accessToken,
      refresh_token_hash: refreshToken,
      last_activity_at: new Date(),
    },
  });
  // 9. Return IAuthorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    grade: admin.grade,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
