import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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

export async function postEcommerceAuthSuperAdministratorLogin(props: {
  body: IEcommerceSuperAdministrator.ILogin;
}): Promise<IEcommerceSuperAdministrator.IAuthorized> {
  // Find super administrator by email
  const superAdmin =
    await MyGlobal.prisma.ecommerce_super_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (!superAdmin) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Create session with proper date handling
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.ecommerce_super_administrator_sessions.create({
      data: {
        id: v4(),
        ecommerce_super_administrator_id: superAdmin.id,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: toISOStringSafe(superAdmin.created_at),
    updated_at: toISOStringSafe(superAdmin.updated_at),
    deleted_at: superAdmin.deleted_at
      ? toISOStringSafe(superAdmin.deleted_at)
      : null,
    token,
  } satisfies IEcommerceSuperAdministrator.IAuthorized;
}
