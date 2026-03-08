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

export async function postDiscussionBoardAuthMemberJoin(props: {
  body: IDiscussionBoardMember.IJoin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member record
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      banned: false,
      ban_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // 4. Generate JWT tokens
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
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized with all required fields
  return {
    id: member.id,
    displayName: member.display_name,
    bio: member.bio ?? undefined,
    createdAt: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    email: member.email,
    updatedAt: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    banned: member.banned,
    deletedAt:
      (member.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null) ?? null,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
