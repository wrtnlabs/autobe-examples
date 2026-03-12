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
import { DiscussionBoardMemberTransformer } from "../transformers/DiscussionBoardMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthMemberJoin(props: {
  ip: string;
  body: IDiscussionBoardMember.IJoin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create member record
  const memberId = v4();
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      banned: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...DiscussionBoardMemberTransformer.select(),
  });
  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: sessionId,
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // Generate JWT tokens
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
  // Return IAuthorized response
  return {
    ...(await DiscussionBoardMemberTransformer.transform(member)),
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
