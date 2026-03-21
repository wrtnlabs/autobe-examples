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

export async function postEcommerceMallAuthAdminLogin(props: {
  ip: string;
  body: IEcommerceMallAdmin.ILogin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash explicitly selected
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...EcommerceMallAdminTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify not soft-deleted
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been suspended", 403);
  }
  // 3. Verify password
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return authorized response
  const transformedAdmin = await EcommerceMallAdminTransformer.transform(admin);
  return {
    ...transformedAdmin,
    access: token.access,
    expired_at: token.expired_at,
    refresh: token.refresh,
    token,
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
