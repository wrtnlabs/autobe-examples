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
export async function postRedditCommunityAuthMemberJoin(props: {
  body: IRedditCommunityMember.IJoin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  // 1. Check for existing email
  const existing = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create member - generate id explicitly
  const now = new Date();
  const createdAt = toISOStringSafe(now);
  const updatedAt = toISOStringSafe(now);
  const memberId = v4();
  const member = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.email.split("@")[0],
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
  });
  // 3. Create session - generate id explicitly
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: sessionId,
        reddit_community_member_id: member.id,
        access_token: v4(),
        refresh_token: v4(),
        ip: "unknown",
        href: "",
        created_at: createdAt,
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );
  // 4. Generate JWT tokens - remove all satisfies type assertions
  const access_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IAuthorized - remove all satisfies type assertions
  return {
    id: member.id,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
