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
import { EcommerceSuperAdministratorTransformer } from "../transformers/EcommerceSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthSuperAdministratorJoin(props: {
  body: IEcommerceSuperAdministrator.IJoin;
}): Promise<IEcommerceSuperAdministrator.IAuthorized> {
  // Check email uniqueness
  const existing =
    await MyGlobal.prisma.ecommerce_super_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create super administrator (manual since no Collector available)
  const adminId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  const superAdministrator =
    await MyGlobal.prisma.ecommerce_super_administrators.create({
      data: {
        id: adminId,
        email: props.body.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...EcommerceSuperAdministratorTransformer.select(),
    });
  // Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.ecommerce_super_administrator_sessions.create({
      data: {
        id: sessionId,
        ecommerce_super_administrator_id: adminId,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
      select: { id: true, created_at: true },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: adminId,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Return authorized response
  return {
    ...(await EcommerceSuperAdministratorTransformer.transform(
      superAdministrator,
    )),
    token,
  } satisfies IEcommerceSuperAdministrator.IAuthorized;
}
