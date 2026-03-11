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
  ip: string;
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Check email uniqueness
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create admin record
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const adminId: string & tags.Format<"uuid"> = v4();
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      grade: props.body.grade ?? "regular",
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      bio: true,
      grade: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 3. Create session record
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: adminId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: nowIso,
      expired_at: accessExpiresIso,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  // 5. Return authorized response
  return {
    id: admin.id,
    display_name: admin.display_name,
    bio: admin.bio,
    grade: admin.grade,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    email: props.body.email,
    deleted_at: null,
    token,
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
