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
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and belongs to admin
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin exists and not deleted
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id },
    ...EcommerceMallAdminTransformer.select(),
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate token expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // 6. Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Transform admin to response format
  const transformed = await EcommerceMallAdminTransformer.transform(admin);
  // 9. Return authorized response with properly typed grade and status
  const { grade, status, ...rest } = transformed;
  return {
    ...rest,
    grade: typia.assert<"regular" | "super_admin">(grade),
    status: typia.assert<"suspended" | "active" | "banned">(status),
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(refreshExpires),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
