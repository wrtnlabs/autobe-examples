import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: IRedditCommunityUser.IRefresh;
}): Promise<IRedditCommunityUser.IAuthorized> {
  const { body } = props;

  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };

  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_user_id: decoded.id,
      },
      include: {
        redditCommunityUser: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.expired_at !== null) {
    const now = toISOStringSafe(new Date());
    if (toISOStringSafe(session.expired_at) <= now) {
      throw new HttpException("Session expired", 401);
    }
  }

  if (session.redditCommunityUser === null) {
    throw new HttpException("User not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  await MyGlobal.prisma.reddit_community_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: session.redditCommunityUser.id,
    email: session.redditCommunityUser.email,
    created_at: toISOStringSafe(session.redditCommunityUser.created_at),
    updated_at: toISOStringSafe(session.redditCommunityUser.updated_at),
    token: token,
  };
}
