import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeAuthModeratorRefresh(props: {
  body: IRedditLikeModerator.IRefresh;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.reddit_like_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        moderator_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate moderator exists and is not deleted
  const moderator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: decoded.id },
      select: { id: true, deleted_at: true, member_id: true },
    });
  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator role has been revoked", 403);
  }
  // 5. Validate member exists and is not deleted
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: moderator.member_id },
    select: { id: true, deleted_at: true },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Member account has been deleted", 403);
  }
  // 6. Generate new tokens with same session_id
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.reddit_like_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Fetch full moderator data with relations
  const moderatorData =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: decoded.id },
      ...RedditLikeModeratorTransformer.select(),
    });
  // 9. Transform and return
  const transformed =
    await RedditLikeModeratorTransformer.transform(moderatorData);
  return {
    ...transformed,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
