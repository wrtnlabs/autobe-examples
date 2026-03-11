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
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) throw new HttpException("Email already registered", 409);
  // Check for duplicate display_name
  const existingDisplayName =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { display_name: props.body.display_name },
    });
  if (existingDisplayName)
    throw new HttpException("Display name already taken", 409);
  // Create member record
  const memberId = v4();
  const now = new Date();
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      is_banned: false,
      ban_reason: null,
      admin_grade: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...DiscussionBoardMemberTransformer.select(),
  });
  // Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: sessionId,
        discussion_board_member_id: memberId,
        access_token: "", // Will be set after JWT generation
        refresh_token: "", // Will be set after JWT generation
        token_expiry: accessExpires,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: now,
        expired_at: refreshExpires,
      },
    },
  );
  // Generate JWT tokens
  const tokenPayload = {
    type: "member",
    id: memberId,
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
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Update session with actual JWT tokens
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  const transformedMember =
    await DiscussionBoardMemberTransformer.transform(member);
  // Fix the bio field type incompatibility and admin_grade undefined issue
  const authorizedMember: IDiscussionBoardMember.IAuthorized = {
    ...transformedMember,
    bio: transformedMember.bio ?? null,
    admin_grade: transformedMember.admin_grade ?? null,
    token,
  };
  return authorizedMember;
}
