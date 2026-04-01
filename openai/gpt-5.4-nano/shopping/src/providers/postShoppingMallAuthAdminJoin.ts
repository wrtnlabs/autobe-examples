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
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminJoin(props: {
  ip: string;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  if (!props?.ip || !props?.body?.email || !props?.body?.password) {
    throw new HttpException("Invalid request", 400);
  }
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const createdAt = new Date();
    const adminCreated = await tx.shopping_mall_admins.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    const sessionExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
    const sessionRefreshableUntil = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    const session = await tx.shopping_mall_admin_sessions.create({
      data: {
        id: v4(),
        ip: props.ip,
        shopping_mall_admin_id: adminCreated.id,
        created_at: createdAt,
        updated_at: createdAt,
        href: "",
        referrer: "",
        expired_at: sessionExpiredAt,
      },
    });
    const admin = await tx.shopping_mall_admins.findUniqueOrThrow({
      where: { id: adminCreated.id },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            shopping_mall_admin_id: true,
            ip: true,
            href: true,
            referrer: true,
            expired_at: true,
          },
        },
        passwordResets: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            token: true,
            expires_at: true,
            shopping_mall_admins_id: true,
          },
        },
      },
    });
    const token: IAuthorizationToken = {
      access: jwt.sign(
        {
          type: "admin",
          id: adminCreated.id,
          session_id: session.id,
          created_at: toISOStringSafe(createdAt),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "admin",
          id: adminCreated.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: toISOStringSafe(createdAt),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: toISOStringSafe(sessionExpiredAt),
      refreshable_until: toISOStringSafe(sessionRefreshableUntil),
    };
    return {
      ...(await ShoppingMallAdminTransformer.transform(admin)),
      token,
    } satisfies IShoppingMallAdmin.IAuthorized;
  });
}
