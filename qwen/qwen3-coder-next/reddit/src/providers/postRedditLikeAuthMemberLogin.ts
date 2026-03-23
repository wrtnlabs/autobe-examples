import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthMemberLogin(props: {
  ip: string;
  body: IRedditLikeMember.ILogin;
}): Promise<IRedditLikeMember.IAuthorized> {
  // 1. Load member with password_hash
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session with full Prisma schema requirements
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session_id = v4() as string & tags.Format<"uuid">;
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const session = await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: session_id,
      member_id: member.id,
      access_token: access,
      refresh_token: refresh,
      access_token_expires_at: toISOStringSafe(accessExpires),
      refresh_token_expires_at: toISOStringSafe(refreshExpires),
      ip: props.ip,
      user_agent: "",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 4. Generate token object
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IRedditLikeMember.IAuthorized
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url
      ? (member.avatar_url as string & tags.Format<"uri">)
      : null,
    karma_score: member.karma_score as number & tags.Type<"int32">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    member: {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name,
      bio: member.bio ?? null,
      avatar_url: member.avatar_url
        ? (member.avatar_url as string & tags.Format<"uri">)
        : null,
      karma_score: member.karma_score as number & tags.Type<"int32">,
      created_at: toISOStringSafe(member.created_at),
    },
    token,
  } satisfies IRedditLikeMember.IAuthorized;
}
