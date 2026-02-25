import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

export async function postDiscussionBoardAuthSuperAdminRefresh(props: {
  body: IDiscussionBoardSuperAdmin.IRefresh;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
        active: true,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const accessExpires = new Date();
  accessExpires.setHours(accessExpires.getHours() + 1);
  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 7);
  const accessToken = jwt.sign(
    {
      type: "superadmin",
      id: session.super_admin_id,
      session_id: session.id,
      created_at: accessExpires.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superadmin",
      id: session.super_admin_id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: refreshExpires.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const admin =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: session.super_admin_id },
    });
  return {
    id: admin.id,
    email: admin.email,
    isSuperAdmin: admin.is_super_admin,
    canPromoteSuperAdmins: admin.can_promote_super_admins,
    createdAt: admin.created_at.toISOString(),
    updatedAt: admin.updated_at.toISOString(),
    deletedAt: admin.deleted_at?.toISOString() ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
