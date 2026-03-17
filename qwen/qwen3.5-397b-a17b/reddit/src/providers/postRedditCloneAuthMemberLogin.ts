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

export async function postRedditCloneAuthMemberLogin(props: {
  ip: string;
  body: IRedditCloneMember.ILogin;
}): Promise<IRedditCloneMember.IAuthorized> {
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      karmaScore: {
        select: {
          id: true,
          score: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (!member.karmaScore) {
    throw new HttpException("Member karma score not found", 500);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId: string & tags.Format<"uuid"> = v4();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const accessExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const tokenCreatedAt: string & tags.Format<"date-time"> =
    toISOStringSafe(now);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: createdAt,
      expired_at: accessExpiresAt,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? undefined,
    avatar: member.avatar ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    email: member.email,
    karma_score: {
      id: member.karmaScore.id,
      score: member.karmaScore.score,
      member: {
        id: member.id,
        username: member.username,
        display_name: member.display_name,
        avatar: member.avatar ?? undefined,
        karma_score: member.karmaScore.score,
        created_at: toISOStringSafe(member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      created_at: toISOStringSafe(member.karmaScore.created_at),
      updated_at: toISOStringSafe(member.karmaScore.updated_at),
    } satisfies IRedditCloneKarmaScore.ISummary,
    token,
  } satisfies IRedditCloneMember.IAuthorized;
}
