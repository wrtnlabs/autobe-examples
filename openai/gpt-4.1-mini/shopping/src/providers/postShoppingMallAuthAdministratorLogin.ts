import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdministratorLogin(props: {
  body: IShoppingMallAdministrator.ILogin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const admin = await MyGlobal.prisma.shopping_mall_administrators.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      name: true,
      is_super_admin: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      administratorGrade: {
        select: {
          id: true,
          name: true,
          grade: true,
          super_administrator: true,
        },
      },
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const now = new Date();
  const createdAt = toISOStringSafe(now);
  const accessExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: v4(),
        administrator: { connect: { id: admin.id } },
        ip: "",
        href: "",
        referrer: "",
        created_at: createdAt,
        expired_at: accessExpiresAt,
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    isSuperAdmin: admin.is_super_admin,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    administratorGrade: {
      id: admin.administratorGrade.id,
      name: admin.administratorGrade.name,
      grade: admin.administratorGrade.grade,
      superAdministrator: admin.administratorGrade.super_administrator,
    },
    token,
  };
}
