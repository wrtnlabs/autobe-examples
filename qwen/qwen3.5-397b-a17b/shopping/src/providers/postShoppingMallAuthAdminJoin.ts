import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminSessionTransformer } from "../transformers/ShoppingMallAdminSessionTransformer";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { ShoppingMallMemberAtSummaryTransformer } from "../transformers/ShoppingMallMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminJoin(props: {
  ip: string;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Check if email already exists in admins table
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered as administrator", 409);
  }
  // 2. Find the member account by email (from approved promotion request)
  const member = await MyGlobal.prisma.shopping_mall_members.findFirstOrThrow({
    where: { email: props.body.email },
  });
  // 3. Hash password and create administrator account
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      member_id: member.id,
      email: props.body.email,
      password_hash: passwordHash,
      grade: props.body.grade,
      banned_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallAdminTransformer.select(),
  });
  // 4. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      access_token: "",
      refresh_token: "",
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
    ...ShoppingMallAdminSessionTransformer.select(),
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    grade: admin.grade,
    bannedAt: admin.banned_at ? toISOStringSafe(admin.banned_at) : null,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    member: await ShoppingMallMemberAtSummaryTransformer.transform(
      admin.member,
    ),
    token,
  } satisfies IShoppingMallAdmin.IAuthorized;
}
