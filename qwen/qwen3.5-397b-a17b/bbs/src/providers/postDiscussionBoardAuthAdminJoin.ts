import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member record with hashed password
  const memberId = v4() as string & tags.Format<"uuid">;
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 3. Create admin record linked to member
  const adminId = v4() as string & tags.Format<"uuid">;
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      member_id: memberId,
      grade: "regular",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 4. Create admin session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: adminId,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
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
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
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
    grade: admin.grade,
    member: {
      id: member.id,
      display_name: member.display_name,
      bio: member.bio,
      status: member.status,
      created_at: member.created_at.toISOString(),
      is_admin: true,
    } satisfies IDiscussionBoardMember.ISummary,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    deleted_at: admin.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
