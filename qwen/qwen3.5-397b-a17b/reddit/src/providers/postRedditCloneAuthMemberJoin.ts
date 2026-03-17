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

export async function postRedditCloneAuthMemberJoin(props: {
  ip: string;
  body: IRedditCloneMember.IJoin;
}): Promise<IRedditCloneMember.IAuthorized> {
  const existingByEmail = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  const existingByUsername =
    await MyGlobal.prisma.reddit_clone_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingByUsername) {
    throw new HttpException("Username already taken", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: props.body.display_name ?? props.body.username,
      bio: null,
      avatar: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const karmaScore = await MyGlobal.prisma.reddit_clone_karma_scores.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: member.id,
      score: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      id: true,
      score: true,
      created_at: true,
      updated_at: true,
    },
  });
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      member_id: member.id,
      access_token,
      refresh_token,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: access_token,
    refresh: refresh_token,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: member.avatar,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    email: member.email,
    karma_score: {
      id: karmaScore.id,
      score: karmaScore.score,
      member: {
        id: member.id,
        username: member.username,
        display_name: member.display_name,
        avatar: member.avatar,
        karma_score: karmaScore.score,
        created_at: toISOStringSafe(member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      created_at: toISOStringSafe(karmaScore.created_at),
      updated_at: toISOStringSafe(karmaScore.updated_at),
    } satisfies IRedditCloneKarmaScore.ISummary,
    token,
  } satisfies IRedditCloneMember.IAuthorized;
}
