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
  // 1. Check email uniqueness
  const existingByEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check display_name uniqueness
  const existingByName =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { display_name: props.body.display_name },
    });
  if (existingByName) {
    throw new HttpException("Display name already taken", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create member record
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      ban_status: "active",
      ban_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      bio: true,
      ban_status: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 5. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "0.0.0.0",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        updated_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // 6. Create email verification token
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.discussion_board_member_email_verifications.create({
    data: {
      id: v4(),
      discussion_board_member_id: member.id,
      token: v4(),
      expires_at: verificationExpires,
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 7. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 8. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    bio: member.bio ?? undefined,
    banStatus: member.ban_status,
    banReason: member.ban_reason ?? undefined,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
