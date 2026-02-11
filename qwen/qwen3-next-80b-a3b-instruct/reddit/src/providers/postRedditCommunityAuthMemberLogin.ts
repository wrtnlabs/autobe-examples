import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityAuthMemberLogin(props: {
  body: IRedditCommunityMember.ILogin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  // 1. Find member with password_hash
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      bio: true,
      created_at: true,
      updated_at: true,
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
  // 3. Create NEW session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = toISOStringSafe(new Date());
  const created_at = now;
  const expired_at = toISOStringSafe(accessExpires);
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: v4(),
        reddit_community_member_id: member.id,
        created_at: created_at,
        expired_at: expired_at,
        access_token: "",
        refresh_token: "",
        ip: "",
        href: "",
      },
    },
  );
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: expired_at,
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  return {
    id: member.id,
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
}
