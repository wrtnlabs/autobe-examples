import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
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

export async function postEconomyPoliticsBoardAuthSuperAdminRefresh(props: {
  body: IEconomyPoliticsBoardSuperAdmin.IRefresh;
}): Promise<IEconomyPoliticsBoardSuperAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "superAdmin";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    try {
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    // 2. Validate type
    if (decoded.type !== "superAdmin") {
      throw new HttpException("Invalid token type", 403);
    }
    // 3. Validate session
    const session =
      await MyGlobal.prisma.economy_politics_board_super_admin_sessions.findFirst(
        {
          where: {
            id: decoded.session_id,
            economy_politics_board_super_admins_id: decoded.id,
          },
        },
      );
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    // 4. Validate actor
    const superAdmin =
      await MyGlobal.prisma.economy_politics_board_super_admins.findUniqueOrThrow(
        {
          where: { id: decoded.id },
        },
      );
    if (superAdmin.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    // 5. Generate new tokens (SAME session_id)
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
    // 6. Update session expiration
    await MyGlobal.prisma.economy_politics_board_super_admin_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires },
    });
    return {
      id: superAdmin.id,
      email: superAdmin.email,
      created_at: toISOStringSafe(superAdmin.created_at),
      updated_at: toISOStringSafe(superAdmin.updated_at),
      deleted_at: superAdmin.deleted_at
        ? toISOStringSafe(superAdmin.deleted_at)
        : null,
      token: token,
    };
  } finally {
  }
}
