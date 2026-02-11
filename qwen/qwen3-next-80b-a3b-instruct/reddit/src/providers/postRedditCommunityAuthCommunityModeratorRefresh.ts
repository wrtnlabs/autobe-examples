import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityModeratorRefresh(props: {
  body: IRedditCommunityCommunityModerator.IRefresh;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "communityModerator";
  };
  try {
    const result = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "communityModerator";
    }>(result);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "communityModerator") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          community_moderator_id: decoded.id,
          expired_at: { gt: toISOStringSafe(new Date()) },
        },
      },
    );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
      },
    );
  if (moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_community_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
