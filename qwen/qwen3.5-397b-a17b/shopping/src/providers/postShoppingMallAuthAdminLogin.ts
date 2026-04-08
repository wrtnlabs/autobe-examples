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
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { ShoppingMallMemberAtSummaryTransformer } from "../transformers/ShoppingMallMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminLogin(props: {
  ip: string;
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...ShoppingMallAdminTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (admin.banned_at !== null) {
    throw new HttpException("Account is banned", 403);
  }
  if (admin.deleted_at !== null) {
    throw new HttpException("Account is deleted", 403);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      access_token: "",
      refresh_token: "",
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(accessExpiresAt),
    },
  });
  const access = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
    },
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
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
