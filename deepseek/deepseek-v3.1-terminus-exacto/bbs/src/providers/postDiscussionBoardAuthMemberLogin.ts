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

export async function postDiscussionBoardAuthMemberLogin(props: {
  ip: string;
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...DiscussionBoardMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if member is banned
  if (member.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Calculate expiration dates
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Generate JWT tokens first
  const sessionId = v4();
  const tokenPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    created_at: toISOStringSafe(now),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session with actual tokens
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: sessionId,
        discussion_board_member_id: member.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: accessExpires,
        ip: props.ip,
        href: "",
        referrer: null,
        created_at: now,
        expired_at: refreshExpires,
      },
    },
  );
  // Construct token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return IAuthorized response
  const transformed = await DiscussionBoardMemberTransformer.transform(member);
  return {
    ...transformed,
    bio: transformed.bio ?? null,
    admin_grade: transformed.admin_grade ?? null,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
