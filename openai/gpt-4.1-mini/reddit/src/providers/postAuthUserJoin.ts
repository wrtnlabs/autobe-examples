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

export async function postAuthUserJoin(props: {
  user: UserPayload;
  body: IRedditCommunityUser.ICreate;
}): Promise<IRedditCommunityUser.IAuthorized> {
  const existingUser = await MyGlobal.prisma.reddit_community_user.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const newUserId = v4() as string & tags.Format<"uuid">;

  const now = toISOStringSafe(new Date());

  const newUser = await MyGlobal.prisma.reddit_community_user.create({
    data: {
      id: newUserId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpiryDateString = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiryDateString = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const newSessionId = v4() as string & tags.Format<"uuid">;

  const newSession =
    await MyGlobal.prisma.reddit_community_user_sessions.create({
      data: {
        id: newSessionId,
        reddit_community_user_id: newUser.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpiryDateString,
      },
    });

  const issuedAtString = toISOStringSafe(new Date());

  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: newUser.id,
        session_id: newSession.id,
        created_at: issuedAtString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: newUser.id,
        session_id: newSession.id,
        tokenType: "refresh",
        created_at: issuedAtString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiryDateString,
    refreshable_until: refreshExpiryDateString,
  };

  return {
    id: newUser.id,
    email: newUser.email,
    created_at: toISOStringSafe(newUser.created_at),
    updated_at: toISOStringSafe(newUser.updated_at),
    token,
  };
}
