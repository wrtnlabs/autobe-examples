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
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at?: string;
  };
  try {
    const result = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof result === "object" && result !== null) {
      decoded = {
        id: (result as any).id,
        session_id: (result as any).session_id,
        type: (result as any).type,
        created_at: (result as any).created_at,
      };
    } else {
      throw new Error("Invalid token payload");
    }
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "superAdmin") {
    throw new HttpException("Invalid token type", 403);
  }
  // Get current time as ISO string
  const nowISO = new Date().toISOString();
  // Validate session exists and active
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_super_admin_id: decoded.id,
        expired_at: { gt: nowISO },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate super admin actor
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration times
  const now = Date.now();
  const accessExpiresMs = now + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = now + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpiresISO = new Date(accessExpiresMs).toISOString();
  const refreshExpiresISO = new Date(refreshExpiresMs).toISOString();
  const tokenPayload = {
    type: "superAdmin",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: nowISO,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session expiration
  await MyGlobal.prisma.discussion_board_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresISO },
  });
  return {
    id: superAdmin.id as string & tags.Format<"uuid">,
    email: superAdmin.email as string & tags.Format<"email">,
    admin_grade: superAdmin.admin_grade,
    created_at: toISOStringSafe(superAdmin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(superAdmin.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: null as (string & tags.Format<"date-time">) | null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresISO as string & tags.Format<"date-time">,
    },
  };
}
