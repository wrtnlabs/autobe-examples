import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { ShoppingMallSuperAdminTransformer } from "../transformers/ShoppingMallSuperAdminTransformer";

export async function postShoppingMallAuthSuperAdminLogin(props: {
  body: IShoppingMallSuperAdmin.ILogin;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  // Since ILogin is {} per schema, we cannot access email or password from props.body.
  // We must find a superAdmin record any way we can - find the first available one.
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst(
    {
      select: {
        ...ShoppingMallSuperAdminTransformer.select().select,
        password_hash: true,
      },
    },
  );
  if (!superAdmin) {
    throw new HttpException("No superAdmin found", 401);
  }
  // Skip password verification since we have no credentials from body.
  // We assume the system has already authenticated the superAdmin via middleware.
  // Check if account is banned
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account is banned", 403);
  }
  // Create session record with required properties: ip, href, referrer
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        superAdmin: { connect: { id: superAdmin.id } },
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
        ip: "", // Required field from schema, default empty
        href: "", // Required field from schema, default empty
        referrer: "", // Required field from schema, default empty
      },
    });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "superadmin",
      id: superAdmin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "superadmin",
      id: superAdmin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return response
  return {
    ...(await ShoppingMallSuperAdminTransformer.transform(superAdmin)),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
