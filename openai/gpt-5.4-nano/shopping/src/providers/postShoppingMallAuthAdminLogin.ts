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

export async function postShoppingMallAuthAdminLogin(props: {
  ip: string;
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const nowIso = toISOStringSafe(new Date());
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  // Avoid leaking whether the account exists
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  const ok = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!ok) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nowUuid = typia.assert<string & tags.Format<"uuid">>(v4());
  const accessExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(accessExpiresDate),
  );
  const refreshExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(refreshExpiresDate),
  );
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: nowUuid,
      shopping_mall_admin_id: admin.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpiresDate,
      updated_at: now,
      deleted_at: null,
    },
  });
  const access = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: nowIso,
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
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  return {
    id: admin.id,
    email: admin.email,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(admin.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(admin.updated_at),
    ),
    deleted_at:
      admin.deleted_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(admin.deleted_at),
          ),
    token,
  };
}
