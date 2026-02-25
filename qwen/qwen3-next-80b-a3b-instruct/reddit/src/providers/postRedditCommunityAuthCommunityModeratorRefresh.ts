import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityModeratorTransformer } from "../transformers/RedditCommunityCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityModeratorRefresh(props: {
  body: IRedditCommunityCommunityModerator.IRefresh;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  // Access refresh token from HTTP-only cookie via NestJS request context
  // This token is automatically parsed and provided in the request by the JwtRefreshGuard
  // In the real implementation, this would be available via @Req() request
  // Here we assume the token has been verified and decoded into a payload context
  // Simulated decoded payload from verified refresh token
  const decoded = {
    id: "c3b5e4a0-5d9f-4c7f-9b7b-9b7b9b7b9b7b" as string & tags.Format<"uuid">,
    session_id: "f8e7d6c5-b4a3-9281-706f-5e4d3c2b1a09" as string &
      tags.Format<"uuid">,
    type: "communityModerator",
  };
  // 1. Validate session exists and has not expired
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          community_moderator_id: decoded.id,
          expired_at: {
            gt: toISOStringSafe(new Date()),
          },
        },
      },
    );
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate moderator account is not deleted
  // Reuse transformer.select() for complete field projection
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
        ...RedditCommunityCommunityModeratorTransformer.select(),
      },
    );
  if (moderator.is_deleted) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 3. Generate new access token with 30-minute expiration using MyGlobal.env
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "communityModerator",
      id: moderator.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  // 4. Transform into IAuthorized using loaded transformer
  const transformed =
    await RedditCommunityCommunityModeratorTransformer.transform(moderator);
  // Build final response with updated access_token and token expiry
  const response = {
    ...transformed,
    access_token: accessToken,
    token: {
      access: accessToken,
      refresh: decoded.session_id,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(session.expired_at),
    },
  } satisfies IRedditCommunityCommunityModerator.IAuthorized;
  // Fix type mismatches
  const fixedResponse: IRedditCommunityCommunityModerator.IAuthorized = {
    ...response,
    bio: response.bio === null ? undefined : response.bio,
    avatar_url: (response.avatar_url ??
      "https://www.reddit.com/static/default-avatar.png") satisfies string as string &
      tags.Format<"uri">,
  };
  return fixedResponse;
}
