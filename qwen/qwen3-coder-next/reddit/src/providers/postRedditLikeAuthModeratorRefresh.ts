import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthModeratorRefresh(props: {
  body: IRedditLikeModerator.IRefresh;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const session =
    await MyGlobal.prisma.reddit_like_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_like_moderator_id: decoded.id,
        expired_at: { gt: now },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate moderator not deleted
  const moderator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_like_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    email: moderator.email as string & tags.Format<"email">,
    email_verified_at: (moderator.email_verified_at
      ? toISOStringSafe(moderator.email_verified_at)
      : toISOStringSafe(new Date(0))) as string & tags.Format<"date-time">,
    username: moderator.username,
    display_name: moderator.display_name,
    bio: moderator.bio ?? "",
    avatar_url: moderator.avatar_url ?? "",
    karma_score: moderator.karma_score as number & tags.Type<"int32">,
    created_at: toISOStringSafe(moderator.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(moderator.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: (moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : toISOStringSafe(new Date(0))) as string & tags.Format<"date-time">,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    } satisfies IAuthorizationToken,
  };
}
