import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
    type: "admin";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and matches stored refresh token
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: decoded.session_id as string & tags.Format<"uuid">,
      shopping_mall_admin_id: decoded.id as string & tags.Format<"uuid">,
      refresh_token: props.body.refreshToken,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin not deleted
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id as string & tags.Format<"uuid"> },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // CRITICAL: Same session
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // CRITICAL: Same session
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Update session with new refresh token (token rotation)
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: decoded.session_id as string & tags.Format<"uuid"> },
    data: {
      refresh_token: token.refresh,
    },
  });
  // 7. Get admin request for requester information
  const adminRequest = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: decoded.id as string & tags.Format<"uuid"> },
  });
  // 8. Return response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    reason: "", // Not applicable for refresh
    status: "pending", // Default status for refresh
    created_at: toISOStringSafe(admin.created_at),
    approved_at: null, // Not available on admin model
    rejected_at: null, // Not available on admin model
    rejection_reason: null, // Not available on admin model
    requester: adminRequest
      ? ({
          id: adminRequest.id as string & tags.Format<"uuid">,
          email: adminRequest.email as string & tags.Format<"email">,
          email_verified: true, // Assuming admin is verified
          created_at: toISOStringSafe(adminRequest.created_at),
          updated_at: toISOStringSafe(adminRequest.updated_at),
        } satisfies IShoppingMallCustomer.ISummary)
      : ({
          id: admin.id as string & tags.Format<"uuid">,
          email: admin.email as string & tags.Format<"email">,
          email_verified: true as boolean,
          created_at: toISOStringSafe(admin.created_at),
          updated_at: toISOStringSafe(admin.updated_at),
        } satisfies IShoppingMallCustomer.ISummary),
    email: admin.email as string & tags.Format<"email">,
    role_grade: admin.role_grade as string,
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    access_token: token.access as string,
    refresh_token: token.refresh as string,
    access_expired_at: token.expired_at as string & tags.Format<"date-time">,
    refresh_expired_at: token.refreshable_until as string &
      tags.Format<"date-time">,
    token: {
      access: token.access as string,
      refresh: token.refresh as string,
      expired_at: token.expired_at as string & tags.Format<"date-time">,
      refreshable_until: token.refreshable_until as string &
        tags.Format<"date-time">,
    } satisfies IAuthorizationToken,
  };
}
