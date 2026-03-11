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

export async function postRedditLikeAuthModeratorLogin(props: {
  ip: string;
  body: IRedditLikeModerator.ILogin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // 1. Find moderator by email with password_hash
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      display_name: true,
      karma_score: true,
      password_hash: true,
    },
  });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session record
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_moderator_sessions.create({
    data: {
      id: v4(),
      reddit_like_moderator_id: moderator.id,
      ip: props.ip,
      href: "/",
      referrer: null,
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "moderator",
    id: moderator.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const refreshPayload = {
    ...accessPayload,
    tokenType: "refresh",
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    }),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return moderator data + token
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    email: moderator.email as string & tags.Format<"email">,
    display_name: moderator.display_name as string & tags.MaxLength<100>,
    karma_score: moderator.karma_score as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    token,
  } satisfies IRedditLikeModerator.IAuthorized;
}
