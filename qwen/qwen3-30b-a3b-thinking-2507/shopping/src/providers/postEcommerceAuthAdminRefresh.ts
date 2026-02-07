import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthAdminRefresh(props: {
  body: IEcommerceAdmin.IRefresh;
}): Promise<IEcommerceAdmin.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };
  try {
    const refreshToken = props.body.refreshToken;
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 403);
    }
    const session = await MyGlobal.prisma.ecommerce_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_admin_id: decoded.id,
      },
    });
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const admin = await MyGlobal.prisma.ecommerce_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
    if (admin.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };
    await MyGlobal.prisma.ecommerce_admin_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires },
    });
    return {
      id: admin.id,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      token: token,
      catch: {
        throw: new HttpException("Invalid or expired refresh token", 401),
      },
    };
  } finally {
  }
}
