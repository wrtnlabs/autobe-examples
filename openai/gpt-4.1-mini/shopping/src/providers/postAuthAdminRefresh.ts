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

export async function postAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const nowUnix = Math.floor(Date.now() / 1000); // current unix time in seconds
  try {
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as { id: string & tags.Format<"uuid">; type: "admin" };

    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 401);
    }

    const user = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new HttpException("User not found", 401);
    }

    const accessTokenExpireSec = 3600;
    const refreshTokenExpireSec = 7 * 24 * 3600;

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name ?? null,
        phone_number: user.phone_number ?? null,
        status: user.status,
        type: "admin",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: accessTokenExpireSec,
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: "admin",
        token_type: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: refreshTokenExpireSec,
        issuer: "autobe",
      },
    );

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      full_name: user.full_name ?? null,
      phone_number: user.phone_number ?? null,
      status: user.status as "active" | "suspended" | "disabled",
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
      shopping_mall_report_count: null,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: toISOStringSafe(
          new Date(Date.now() + accessTokenExpireSec * 1000),
        ),
        refreshable_until: toISOStringSafe(
          new Date(Date.now() + refreshTokenExpireSec * 1000),
        ),
      },
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
}
