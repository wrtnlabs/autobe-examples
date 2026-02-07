import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  try {
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      type: string;
      id: string;
      session_id: string;
      tokenType: string;
      created_at: string;
    };
    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 403);
    }
    const session =
      await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
        where: {
          id: decoded.session_id,
          admin_id: decoded.id,
        },
      });
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const admin =
      await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
        where: { id: decoded.id },
      });
    if (admin.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const now = toISOStringSafe(new Date());
    const accessExpires = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const refreshExpires = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    const token = {
      access: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: now,
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
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    };
    await MyGlobal.prisma.community_platform_admin_sessions.update({
      where: { id: decoded.session_id },
      data: {
        expired_at: refreshExpires,
      },
    });
    return {
      id: decoded.id,
      token: {
        access: token.access,
        refresh: token.refresh,
        expired_at: token.expired_at,
        refreshable_until: token.refreshable_until,
      },
    };
  } finally {
  }
}
