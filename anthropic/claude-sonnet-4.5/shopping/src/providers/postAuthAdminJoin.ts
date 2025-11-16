import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // Phase 1: Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Phase 2: Hash password securely
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Phase 3: Create admin actor record
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      full_name: props.body.full_name,
      phone_number: props.body.phone_number,
      admin_level: props.body.admin_level,
      email_verified: props.body.email_verified,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Phase 4: Create session record
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });

  // Phase 5: Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Phase 6: Return authorized admin response
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone_number: admin.phone_number,
    admin_level: typia.assert<"super_admin" | "moderator" | "support">(
      admin.admin_level,
    ),
    email_verified: admin.email_verified,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
    token,
  };
}
