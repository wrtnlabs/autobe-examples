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

export async function postDiscussionBoardAuthSuperAdminLogin(props: {
  body: IDiscussionBoardSuperAdmin.ILogin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Find super admin by email with password_hash
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        privilege_level: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!superAdmin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create new session with proper date handling
  const now = toISOStringSafe(new Date());
  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4(),
        discussion_board_super_admin_id: superAdmin.id,
        access_token: v4(),
        refresh_token: v4(),
        ip: "", // Would come from request context in real implementation
        href: "", // Would come from request context in real implementation
        referrer: "", // Would come from request context in real implementation
        expired_at: toISOStringSafe(new Date(accessExpiresMs)),
        created_at: now,
        updated_at: now,
      },
    });
  // 4. Generate JWT tokens with proper date handling
  const token = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(accessExpiresMs)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
  };
  // 5. Return IAuthorized response with proper date conversion
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    privilege_level: superAdmin.privilege_level,
    created_at: toISOStringSafe(superAdmin.created_at),
    updated_at: toISOStringSafe(superAdmin.updated_at),
    deleted_at: superAdmin.deleted_at
      ? toISOStringSafe(superAdmin.deleted_at)
      : null,
    token,
  };
}
