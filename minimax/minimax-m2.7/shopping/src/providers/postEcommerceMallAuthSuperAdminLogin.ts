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
import { EcommerceMallSuperAdminTransformer } from "../transformers/EcommerceMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSuperAdminLogin(props: {
  ip: string;
  body: IEcommerceMallSuperAdmin.ILogin;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // 1. Find super admin by email with password_hash explicitly selected
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        ...EcommerceMallSuperAdminTransformer.select().select,
        password_hash: true,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password using PasswordUtil.verify()
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4(),
        ecommerce_mall_super_admin_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    });
  // 4. Generate JWT tokens
  const now = new Date();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "super_admin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "super_admin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized - use transformer output and add token
  const transformed =
    await EcommerceMallSuperAdminTransformer.transform(superAdmin);
  return {
    ...transformed,
    token,
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
