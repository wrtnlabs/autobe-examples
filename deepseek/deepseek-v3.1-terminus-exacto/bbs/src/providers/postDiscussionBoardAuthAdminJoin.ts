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
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthAdminJoin(props: {
  ip: string;
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // Check for existing admin with same email
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create admin record with default 'regular' grade
  const adminId = v4();
  const now = new Date().toISOString();
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      admin_grade: "regular",
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
    ...DiscussionBoardAdminTransformer.select(),
  });
  // Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: adminId,
      access_token: "", // Will be set by JWT
      refresh_token: "", // Will be set by JWT
      ip: props.ip,
      href: "/discussionBoard/auth/admin/join", // Set the endpoint path
      referrer: null,
      user_agent: null,
      created_at: new Date(now),
      updated_at: new Date(now),
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const tokenPayload = {
    type: "admin",
    id: adminId,
    session_id: sessionId,
    created_at: now,
  };
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...tokenPayload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Return IAuthorized response
  const adminData = await DiscussionBoardAdminTransformer.transform(admin);
  return {
    ...adminData,
    token,
  };
}
