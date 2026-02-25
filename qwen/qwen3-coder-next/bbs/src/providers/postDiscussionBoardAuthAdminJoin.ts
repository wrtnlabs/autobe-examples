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

export async function postDiscussionBoardAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create admin record
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      is_super_admin: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      promoted_by_id: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      is_super_admin: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      promoted_by_id: true,
    },
  });
  // 3. Create admin session (include required ip and href fields)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      admin: {
        connect: {
          id: admin.id,
        },
      },
      ip: "127.0.0.1",
      href: "/discussionBoard/auth/admin/join",
      access_token: v4(),
      refresh_token: v4(),
      expired_at: accessExpires,
      created_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      id: true,
    },
  });
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    is_super_admin: admin.is_super_admin,
    is_active: admin.is_active,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    deleted_at: admin.deleted_at?.toISOString() ?? null,
    promoted_by_id: admin.promoted_by_id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
