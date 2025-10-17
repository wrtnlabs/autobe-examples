import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRefresh;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  try {
    const decoded = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string & tags.Format<"uuid">;
      type: "admin";
    };

    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 401);
    }

    const admin = await MyGlobal.prisma.reddit_community_admins.findFirst({
      where: { id: decoded.id, deleted_at: null },
    });

    if (!admin) {
      throw new HttpException("Admin not found or deleted", 401);
    }

    const nowMillis = Date.now();
    const accessExpiredAt = toISOStringSafe(new Date(nowMillis + 3600 * 1000));
    const refreshableUntil = toISOStringSafe(
      new Date(nowMillis + 7 * 24 * 3600 * 1000),
    );

    const accessTokenPayload = {
      id: admin.id,
      email: admin.email,
      password_hash: admin.password_hash,
      admin_level: admin.admin_level,
      type: "admin",
    };

    const newAccessToken = jwt.sign(
      accessTokenPayload,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshTokenPayload = {
      id: admin.id,
      tokenType: "refresh",
    };

    const newRefreshToken = jwt.sign(
      refreshTokenPayload,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    return {
      id: admin.id,
      email: admin.email as string & tags.Format<"email">,
      password_hash: admin.password_hash,
      admin_level: admin.admin_level as number & tags.Type<"int32">,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      token: {
        access: newAccessToken,
        refresh: newRefreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
}
