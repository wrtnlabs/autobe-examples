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
  // 1. Check duplicate admin email
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create admin record
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      is_active: true,
      status: "active",
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at: null,
      suspended_at: null,
    },
  });
  // 3. Create admin session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: admin.id,
      ip: props.ip ?? "",
      href: "",
      referrer: null,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
    },
  });
  // 4. Generate JWT tokens
  const access: string = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized structure
  return {
    access_token: access,
    refresh_token: refresh,
    admin_id: admin.id,
    token,
  } satisfies IShoppingMallAdmin.IAuthorized;
}
