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

export async function postEcommerceMallAuthAdminJoin(props: {
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password and create admin record
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const adminId = v4();
  const now = new Date();
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      name: props.body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...EcommerceMallAdminTransformer.select(),
  });
  // 3. Create session record with JWT tokens
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_admin_id: adminId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return authorized response
  return {
    ...(await EcommerceMallAdminTransformer.transform(admin)),
    token: typia.assert<IAuthorizationToken>(access),
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
  };
}
