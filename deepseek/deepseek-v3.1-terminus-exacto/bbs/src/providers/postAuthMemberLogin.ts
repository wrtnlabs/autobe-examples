import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // Step 1: Find member by email (ensure active account)
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Ensure member is not soft-deleted
    },
  });

  if (!member) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Step 2: Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Step 3: Create new session with proper IP handling
  const currentTime = new Date();
  const accessExpires = new Date(currentTime.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(
    currentTime.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // 7 days

  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "", // Handle optional IP field
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: currentTime.toISOString(),
        updated_at: currentTime.toISOString(),
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );

  // Step 4: Generate JWT tokens with proper payload structure
  const tokenPayloadBase = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: currentTime.toISOString(),
  };

  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayloadBase, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayloadBase,
        tokenType: "refresh" as const,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 5: Return member profile with proper null/undefined handling
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name ?? undefined,
    bio: member.bio ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
    token,
  };
}
