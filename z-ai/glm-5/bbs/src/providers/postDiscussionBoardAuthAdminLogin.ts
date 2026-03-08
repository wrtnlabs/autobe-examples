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
  // 1. Find admin by email with password_hash
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      bio: true,
      grade: true,
      banned_at: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Generic error to prevent email enumeration
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Store banned_at and deleted_at BEFORE validation checks to avoid control flow narrowing
  const bannedAt = admin.banned_at;
  const deletedAt = admin.deleted_at;
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check account status - soft-deleted accounts cannot authenticate
  if (deletedAt !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // Banned accounts cannot authenticate
  if (bannedAt !== null) {
    throw new HttpException(
      admin.ban_reason !== null
        ? `Account is banned: ${admin.ban_reason}`
        : "Account is banned",
      403,
    );
  }
  // 4. Enforce single session policy - delete existing sessions
  await MyGlobal.prisma.discussion_board_admin_sessions.deleteMany({
    where: { discussion_board_admin_id: admin.id },
  });
  // 5. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      discussion_board_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Return IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    displayName: admin.display_name,
    bio: admin.bio,
    grade: typia.assert<"regular" | "super">(admin.grade),
    bannedAt: bannedAt !== null ? toISOStringSafe(bannedAt) : null,
    banReason: admin.ban_reason,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: deletedAt !== null ? toISOStringSafe(deletedAt) : null,
    token,
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
