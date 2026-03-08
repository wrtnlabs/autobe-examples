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
  // 1. Find administrator with password_hash explicitly selected
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!administrator) throw new HttpException("Invalid credentials", 401);
  if (administrator.deleted_at !== null)
    throw new HttpException("Invalid credentials", 401);
  // 2. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Calculate expiration timestamps
  const nowTimestamp = Date.now();
  const accessExpiresTimestamp = nowTimestamp + 60 * 60 * 1000;
  const refreshExpiresTimestamp = nowTimestamp + 7 * 24 * 60 * 60 * 1000;
  // 4. Create NEW session record
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: v4(),
        administrator_id: administrator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(nowTimestamp).toISOString(),
        expired_at: new Date(accessExpiresTimestamp).toISOString(),
      },
    });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        created_at: new Date(nowTimestamp).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date(nowTimestamp).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: new Date(accessExpiresTimestamp).toISOString(),
    refreshable_until: new Date(refreshExpiresTimestamp).toISOString(),
  };
  // 6. Return IAuthorized
  return {
    id: administrator.id,
    email: administrator.email,
    grade: typia.assert<IShoppingMallAdministratorGrade>(administrator.grade),
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: null,
    token,
  };
}
