import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoAdminTransformer } from "../transformers/MultiUserTodoAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthAdminRefresh(props: {
  body: IMultiUserTodoAdmin.IRefresh;
}): Promise<IMultiUserTodoAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
    tokenType?: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin" || decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find and validate session
  const session =
    await MyGlobal.prisma.multi_user_todo_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_admin_id: decoded.id,
        refresh_token: props.body.refreshToken,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin exists and not deleted
  const admin = await MyGlobal.prisma.multi_user_todo_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Admin account has been deleted", 403);
  }
  // 5. Calculate expiration timestamps
  const now = Date.now();
  const accessExpiresMs = now + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = now + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpiresDate = new Date(accessExpiresMs);
  const refreshExpiresDate = new Date(refreshExpiresMs);
  // 6. Generate new tokens with same session_id
  const tokenPayload = {
    type: "admin",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: new Date(now).toISOString(),
  };
  const refreshTokenPayload = {
    ...tokenPayload,
    tokenType: "refresh",
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new refresh token and expiration
  await MyGlobal.prisma.multi_user_todo_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresDate,
    },
  });
  // 8. Transform admin data
  const adminTransformer =
    await import("../transformers/MultiUserTodoAdminTransformer");

  const adminData =
    await adminTransformer.MultiUserTodoAdminTransformer.transform(admin);
  // 9. Return authorized response
  return {
    id: adminData.id,
    email: adminData.email,
    display_name: adminData.display_name,
    created_at: adminData.created_at,
    updated_at: adminData.updated_at,
    deleted_at: adminData.deleted_at,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresDate.toISOString(),
      refreshable_until: refreshExpiresDate.toISOString(),
    },
  };
}
