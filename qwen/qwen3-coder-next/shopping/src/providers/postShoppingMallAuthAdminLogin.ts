import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminLogin(props: {
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Find admin with password_hash
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...ShoppingMallAdminTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create NEW session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      access_token: "",
      refresh_token: "",
      access_token_expires_at: accessExpires.toISOString(),
      refresh_token_expires_at: refreshExpires.toISOString(),
      ip: "127.0.0.1",
      user_agent: null,
      href: null,
      referrer: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
    },
  });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "admin",
    id: admin.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const refreshPayload = {
    type: "admin",
    id: admin.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: now.toISOString(),
  };
  const access_token = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const refresh_token = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // 5. Get transformed admin data
  const adminData = await ShoppingMallAdminTransformer.transform(admin);
  // 6. Return IAuthorized response with all required fields
  return {
    ...adminData,
    email: admin.email as string & tags.Format<"email">,
    role_grade: admin.role_grade as string,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: admin.deleted_at?.toISOString() as string &
      tags.Format<"date-time">,
    access_token,
    refresh_token,
    access_expired_at: accessExpires.toISOString(),
    refresh_expired_at: refreshExpires.toISOString(),
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IShoppingMallAdmin.IAuthorized;
}
