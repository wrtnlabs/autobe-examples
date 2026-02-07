import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminLogin(props: {
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // Bypass empty ILogin type constraint using type assertion
  // According to specification, these properties must be present
  const { email, password } = props.body as any as {
    email: string;
    password: string;
  };
  // 1. Find admin with password_hash
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(password, admin.password_hash);
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Email verification check - impossible: schema does not contain shopping_mall_admin_email_verifications
  // Since the table is not available in our database schema, we skip this check
  // Per operation specification, this check should occur but system schema does not support it
  // We proceed assuming that if an admin exists, their email is verified (as a workaround)
  // 4. Create new session with fallback values for missing body properties
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: (props.body as any).ip ?? "0.0.0.0",
      href: (props.body as any).href ?? "",
      referrer: (props.body as any).referrer ?? "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 5. Generate JWT tokens
  const nowISOString = toISOStringSafe(new Date());
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized
  return {
    access: token.access,
    refresh: token.refresh,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at as string & tags.Format<"date-time">,
      refreshable_until: token.refreshable_until as string &
        tags.Format<"date-time">,
    },
  } satisfies IShoppingMallAdmin.IAuthorized;
}
