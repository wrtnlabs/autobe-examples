import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
  body: IDiscussionBoardAdmin.ILogin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // Find admin by email with password_hash
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      is_banned: true,
      ban_reason: true,
      role: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Reject banned admin
  if (admin.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  // Create NEW session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      discussion_board_admin_id: admin.id,
      ip: "0.0.0.0",
      href: "/discussionBoard/auth/admin/login",
      referrer: null,
      access_token: "access_token_placeholder",
      refresh_token: "refresh_token_placeholder",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Transform admin to response format
  return {
    id: admin.id as string & tags.Format<"uuid">,
    token,
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
