import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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

export async function postEcommerceAuthAdministratorJoin(props: {
  body: IEcommerceAdministrator.IJoin;
}): Promise<IEcommerceAdministrator.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_administrators.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create administrator record
  const adminId = v4() as string & tags.Format<"uuid">;
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const administrator = await MyGlobal.prisma.ecommerce_administrators.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    } satisfies Prisma.ecommerce_administratorsSelect,
  });
  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_administrator_sessions.create({
    data: {
      id: sessionId,
      ecommerce_administrator_id: administrator.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip_address: "0.0.0.0", // Default IP since not provided in props
      user_agent: "unknown", // Default user agent since not provided in props
      created_at: now,
      expires_at: accessExpires,
      last_used_at: now,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: administrator.id,
    email: administrator.email,
    created_at: administrator.created_at.toISOString(),
    updated_at: administrator.updated_at.toISOString(),
    deleted_at: administrator.deleted_at
      ? administrator.deleted_at.toISOString()
      : null,
    token,
  } satisfies IEcommerceAdministrator.IAuthorized;
}
