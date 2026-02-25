import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function postDiscussionBoardAuthAdminLogin(props: {
  ip: string;
  body: IDiscussionBoardAdmin.ILogin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Find admin with password_hash
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      display_name: true,
      email: true,
      is_super_admin: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      promoted_by_id: true,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Check admin is_active status
  if (!admin.is_active)
    throw new HttpException("Admin account is inactive", 403);
  // 4. Create new admin session with proper type conversion
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const created_at = toISOStringSafe(now);
  const access_token = v4(); // Generated access token for session
  const refresh_token = v4(); // Generated refresh token for session
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      discussion_board_admin_id: admin.id,
      created_at,
      expired_at: toISOStringSafe(accessExpires),
      access_token,
      refresh_token,
      updated_at: created_at,
      ip: props.ip || "0.0.0.0",
      href: "",
    },
  });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "admin" as const,
    id: admin.id,
    session_id: session.id,
    created_at,
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Get promotedBy super admin if exists
  let promotedBy: IDiscussionBoardSuperAdmin.ISummary | null = null;
  if (admin.promoted_by_id) {
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findFirst({
        where: { id: admin.promoted_by_id },
        select: {
          id: true,
          email: true,
          created_at: true,
        },
      });
    if (superAdmin) {
      promotedBy = {
        id: superAdmin.id,
        email: superAdmin.email,
        created_at: toISOStringSafe(superAdmin.created_at),
      };
    }
  }
  // 7. Return IAuthorized response
  return {
    id: admin.id,
    display_name: admin.display_name,
    email: admin.email,
    is_super_admin: admin.is_super_admin,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    promoted_by_id: admin.promoted_by_id,
    promotedBy,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
