import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function postDiscussionBoardAuthMemberLogin(props: {
  ip: string;
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      display_name: true,
      bio: true,
      banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check if banned
  if (member.banned) {
    throw new HttpException("Account is banned", 403);
  }
  // 4. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.ip,
        href: "",
        referrer: null,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
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
    id: member.id,
    display_name: member.display_name,
    bio: member.bio,
    banned: member.banned,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
