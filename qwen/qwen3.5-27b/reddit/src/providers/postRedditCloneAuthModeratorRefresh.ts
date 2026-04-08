import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneUserProfileAtSummaryTransformer } from "../transformers/RedditCloneUserProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthModeratorRefresh(props: {
  body: IRedditCloneModerator.IRefresh;
}): Promise<IRedditCloneModerator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Query moderator record
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findUnique({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      reddit_clone_user_profile_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
    },
  });
  if (!moderator) {
    throw new HttpException("Moderator account not found or deleted", 401);
  }
  // 4. Query active session
  const session =
    await MyGlobal.prisma.reddit_clone_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_clone_moderator_id: decoded.id,
        expired_at: {
          gt: new Date(),
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Generate new tokens (same session_id)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_clone_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Transform user profile
  const userProfile =
    await RedditCloneUserProfileAtSummaryTransformer.transform(
      moderator.userProfile,
    );
  return {
    id: moderator.id,
    email: moderator.email,
    reddit_clone_user_profile_id: moderator.reddit_clone_user_profile_id,
    created_at: moderator.created_at.toISOString(),
    updated_at: moderator.updated_at.toISOString(),
    deleted_at: moderator.deleted_at?.toISOString() ?? null,
    userProfile,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
