import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IShoppingMallAdministrator.ICreate;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_administrators.findFirst(
    {
      where: { email: props.body.email },
    },
  );

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Create administrator record
  const now = toISOStringSafe(new Date());
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: hashedPassword,
        first_name: props.body.first_name,
        last_name: props.body.last_name,
        role: props.body.role,
        permissions: props.body.permissions,
        status: props.body.status ?? "pending_activation",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: v4(),
        shopping_mall_administrator_id: administrator.id,
        ip: "", // Default empty string since not provided
        href: "", // Default empty string since not provided
        referrer: "", // Default empty string since not provided
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: administrator.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authorized response
  return {
    id: administrator.id,
    token,
    administrator: {
      id: administrator.id,
      name: `${administrator.first_name} ${administrator.last_name}`,
      email: administrator.email,
      role: administrator.role,
    },
  };
}
