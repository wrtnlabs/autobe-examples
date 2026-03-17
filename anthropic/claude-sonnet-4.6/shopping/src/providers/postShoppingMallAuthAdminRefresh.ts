import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function postShoppingMallAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Find session by refresh_token (unique index)
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: { refresh_token: props.body.refresh_token },
    select: {
      id: true,
      shopping_mall_admin_id: true,
      expired_at: true,
    },
  });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Check session not expired
  if (session.expired_at <= new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 3. Load admin record, verify account is active
  const adminCheck =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: session.shopping_mall_admin_id },
      select: { deleted_at: true },
    });
  if (adminCheck.deleted_at !== null) {
    throw new HttpException("Administrator account has been deactivated", 401);
  }
  // 4. Generate new JWT access and refresh tokens (same session_id)
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "admin",
      id: session.shopping_mall_admin_id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "admin",
      id: session.shopping_mall_admin_id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Rotate session: replace tokens and extend expiry
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresAt,
    },
  });
  // 6. Load full admin profile for response
  const fullAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: session.shopping_mall_admin_id },
      ...ShoppingMallAdminTransformer.select(),
    });
  const adminDto = await ShoppingMallAdminTransformer.transform(fullAdmin);
  // 7. Build and return IShoppingMallAdmin.IAuthorized
  return {
    id: adminDto.id,
    email: adminDto.email,
    actor_type: adminDto.actor_type,
    grade: adminDto.grade,
    origin: adminDto.origin,
    created_at: adminDto.created_at,
    updated_at: adminDto.updated_at,
    deleted_at: adminDto.deleted_at,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    } satisfies IAuthorizationToken,
    admin: adminDto,
  } satisfies IShoppingMallAdmin.IAuthorized;
}
