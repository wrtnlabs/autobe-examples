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

export async function postRedditCommunityAuthMemberRefresh(props: {
  body: IRedditCommunityMember.IRefresh;
}): Promise<IRedditCommunityMember.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: string;
  };
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified !== "object" || verified === null) {
      throw new HttpException("Invalid token format", 401);
    }
    const payload = verified as Record<string, unknown>;
    decoded = {
      id: payload.id as string & tags.Format<"uuid">,
      session_id: payload.session_id as string & tags.Format<"uuid">,
      type: String(payload.type),
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
        reddit_community_member_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresAt,
    },
  });
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: member.avatar,
    karma: member.karma,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  };
}
