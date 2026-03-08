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

export async function postDiscussionBoardAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create admin record
  const now = new Date();
  const adminId = v4();
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name ?? props.body.email,
      bio: props.body.bio ?? null,
      grade: "regular",
      banned_at: null,
      ban_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    displayName: admin.display_name,
    bio: admin.bio,
    grade: admin.grade === "super" ? "super" : "regular",
    bannedAt: admin.banned_at?.toISOString() ?? null,
    banReason: admin.ban_reason ?? null,
    createdAt: admin.created_at.toISOString(),
    updatedAt: admin.updated_at.toISOString(),
    deletedAt: admin.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
