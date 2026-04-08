import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdminTransformer } from "../transformers/EcommerceAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthAdminRefresh(props: {
  body: IEcommerceAdmin.IRefresh;
}): Promise<IEcommerceAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
    created_at: string;
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "admin";
      created_at: string;
    }>(
      jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Find and validate session
  const session = await MyGlobal.prisma.ecommerce_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      ecommerce_admin_id: decoded.id,
      deleted_at: null,
      expired_at: { gte: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin exists and is not deleted
  const admin = await MyGlobal.prisma.ecommerce_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Verify admin grade exists (invalidates old sessions on grade change)
  const currentGrade =
    await MyGlobal.prisma.ecommerce_administrator_grades.findFirst({
      where: {
        ecommerce_admin_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!currentGrade) {
    throw new HttpException("Administrator grade not found", 401);
  }
  // 6. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.ecommerce_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return IAuthorized with admin details and tokens
  const adminWithGrade =
    await MyGlobal.prisma.ecommerce_admins.findUniqueOrThrow({
      where: { id: decoded.id },
      ...EcommerceAdminTransformer.select(),
    });
  const transformedAdmin =
    await EcommerceAdminTransformer.transform(adminWithGrade);
  if (!transformedAdmin.grade) {
    throw new HttpException("Administrator grade not found", 401);
  }
  return {
    id: transformedAdmin.id,
    email: transformedAdmin.email,
    grade: transformedAdmin.grade,
    created_at: transformedAdmin.created_at,
    updated_at: transformedAdmin.updated_at,
    deleted_at: transformedAdmin.deleted_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IEcommerceAdmin.IAuthorized;
}
