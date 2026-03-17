import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSuperAdminRefresh(props: {
  body: IEcommerceMallSuperAdmin.IRefresh;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "superAdmin";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "superAdmin";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "superAdmin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 2. Validate session exists and not expired
  const nowISO = new Date().toISOString();
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        super_admin_id: decoded.id,
        expired_at: { gt: new Date() },
      },
      select: { id: true, super_admin_id: true },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate super admin exists and not deleted
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Calculate expiration timestamps
  const accessExpires = new Date();
  accessExpires.setHours(accessExpires.getHours() + 1);
  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 7);
  const accessExpiresISO = toISOStringSafe(accessExpires);
  const refreshExpiresISO = toISOStringSafe(refreshExpires);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 6. Return authorized response
  return {
    id: superAdmin.id as string & tags.Format<"uuid">,
    email: superAdmin.email as string & tags.Format<"email">,
    grade: superAdmin.grade,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
