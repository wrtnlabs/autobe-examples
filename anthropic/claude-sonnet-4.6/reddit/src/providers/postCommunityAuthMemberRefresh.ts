import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberRefresh(props: {
  body: ICommunityMember.IRefresh;
}): Promise<ICommunityMember.IAuthorized> {
  // Step 1: Verify JWT signature of the submitted refresh token
  let decoded: {
    type: string;
    id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      type: string;
      id: string;
      session_id: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // Step 2: Locate the active session record by matching refresh_token and ensuring it has not expired
  const session = await MyGlobal.prisma.community_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      community_member_id: decoded.id,
      expired_at: { gt: new Date() },
    },
    select: {
      id: true,
      community_member_id: true,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Step 3: Load the member record and verify the account has not been deleted
  const member = await MyGlobal.prisma.community_members.findUniqueOrThrow({
    where: { id: session.community_member_id },
    select: {
      id: true,
      username: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
        },
      },
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // Step 4: Generate new token pair — SAME session_id to preserve session continuity
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Step 5: Update the session record with the new tokens and extended expiry
  await MyGlobal.prisma.community_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // Step 6: Build and return the authorized member response
  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    email: member.email as string & tags.Format<"email">,
    display_name: member.profile?.display_name ?? null,
    bio: member.profile?.bio ?? null,
    avatar_url: (member.profile?.avatar_url ?? null) as
      | (string & tags.Format<"uri">)
      | null,
    karma_score: (member.profile?.karma_score ?? 0) as number &
      tags.Type<"int32">,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IAuthorizationToken,
  } satisfies ICommunityMember.IAuthorized;
}
