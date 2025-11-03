import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.ICreate;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // 3. Prepare IDs and timestamps
  const adminId = v4();
  const now = toISOStringSafe(new Date());
  // 4. Create admin
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.display_name,
      avatar_url: props.body.avatar_url ?? null,
      is_locked: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  });
  // 5. Create session (1 hour expiry, empty IP fields)
  const sessionId = v4();
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: admin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    avatar_url: admin.avatar_url ?? null,
    is_locked: admin.is_locked,
    deleted_at:
      admin.deleted_at !== null ? toISOStringSafe(admin.deleted_at) : null,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
