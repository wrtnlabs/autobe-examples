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

export async function postShoppingMallAuthAdminJoin(props: {
  ip: string;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (existing && existing.deleted_at === null) {
    throw new HttpException("Email already registered", 409);
  }
  const { admin, session } = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdAdmin = await tx.shopping_mall_admins.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email as string & tags.Format<"email">,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const createdSession = await tx.shopping_mall_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_admin_id: createdAdmin.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: nowIso,
        expired_at: accessExpiresIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    return {
      admin: createdAdmin,
      session: createdSession,
    };
  });
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    token,
  };
}
