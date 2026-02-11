import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
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

export async function postCommunityAuthAdminRefresh(props: {
  body: ICommunityAdmin.IRefresh;
}): Promise<ICommunityAdmin.IAuthorized> {
  try {
    interface TokenPayload {
      type: string;
      id: string;
      session_id: string;
      tokenType?: string;
      created_at?: string;
    }
    const decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as TokenPayload;
    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 403);
    }
    const session = await MyGlobal.prisma.community_admin_sessions.findFirst({
      where: {
        id: decoded.session_id.toString(),
        community_admin_id: decoded.id.toString(),
      },
    });
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const admin = await MyGlobal.prisma.community_admins.findUniqueOrThrow({
      where: { id: decoded.id.toString() },
      include: { sessions: false },
    });
    if (admin.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenPayload = {
      access: jwt.sign(
        {
          type: "admin",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "15m", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "admin",
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
    await MyGlobal.prisma.community_admin_sessions.update({
      where: { id: decoded.session_id.toString() },
      data: { expired_at: refreshExpires },
    });
    return {
      id: admin.id.toString(),
      email: admin.email,
      username: admin.username,
      display_name: admin.display_name !== null ? admin.display_name : null,
      bio: admin.bio !== null ? admin.bio : null,
      avatar_url: admin.avatar_url !== null ? admin.avatar_url : null,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      token: tokenPayload,
    };
  } finally {
  }
}
