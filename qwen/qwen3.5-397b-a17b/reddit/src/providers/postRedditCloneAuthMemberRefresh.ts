import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberRefresh(props: {
  body: IRedditCloneMember.IRefresh;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "member";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member exists and is not deleted
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Update session with new tokens and expiration
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
      expired_at: refreshExpires,
    },
  });
  // 7. Get karma score for the member
  const karmaScore = await MyGlobal.prisma.reddit_clone_karma_scores.findFirst({
    where: { member_id: decoded.id },
  });
  // 8. Return authorized member info
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? undefined,
    avatar: member.avatar ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    email: member.email,
    karma_score: karmaScore
      ? ({
          id: karmaScore.id,
          score: karmaScore.score,
          member: {
            id: member.id,
            username: member.username,
            display_name: member.display_name,
            avatar: member.avatar ?? undefined,
            karma_score: karmaScore.score,
            created_at: toISOStringSafe(member.created_at),
          } satisfies IRedditCloneMember.ISummary,
          created_at: toISOStringSafe(karmaScore.created_at),
          updated_at: toISOStringSafe(karmaScore.updated_at),
        } satisfies IRedditCloneKarmaScore.ISummary)
      : ({
          id: v4(),
          score: 0,
          member: {
            id: member.id,
            username: member.username,
            display_name: member.display_name,
            avatar: member.avatar ?? undefined,
            karma_score: 0,
            created_at: toISOStringSafe(member.created_at),
          } satisfies IRedditCloneMember.ISummary,
          created_at: toISOStringSafe(now),
          updated_at: toISOStringSafe(now),
        } satisfies IRedditCloneKarmaScore.ISummary),
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    } satisfies IAuthorizationToken,
  } satisfies IRedditCloneMember.IAuthorized;
}
