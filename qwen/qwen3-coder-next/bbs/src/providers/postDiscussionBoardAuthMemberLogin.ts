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
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...DiscussionBoardMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Check account status
  if (member.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 404);
  }
  // 4. Generate JWT tokens
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session_id = v4();
  const accessPayload = {
    type: "member" as const,
    id: member.id,
    session_id,
    created_at: now.toISOString(),
  };
  const refreshPayload = {
    type: "member" as const,
    id: member.id,
    session_id,
    tokenType: "refresh" as const,
    created_at: now.toISOString(),
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // 5. Create session record
  await MyGlobal.prisma.discussion_board_member_sessions.create({
    data: {
      id: session_id,
      discussion_board_member_id: member.id,
      access_token: access,
      refresh_token: refresh,
      ip: "127.0.0.1", // TODO: Get from request
      referrer: null,
      user_agent: null,
      created_at: now,
      expired_at: accessExpires,
      invalidated_at: null,
    },
  });
  // 6. Return authorized member
  const transformed = await DiscussionBoardMemberTransformer.transform(member);
  return {
    ...transformed,
    bio: transformed.bio ?? null,
    ban_reason: transformed.ban_reason ?? null,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IDiscussionBoardMember.IAuthorized;
}
