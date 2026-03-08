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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditLikeAuthModeratorLogin(props: {
  ip: string;
  body: IRedditLikeModerator.ILogin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // 1. Find moderator by email with password_hash
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      email_verified_at: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
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
  // 3. Check email verification
  if (!moderator.email_verified_at) {
    throw new HttpException("Email not verified", 403);
  }
  // 4. Check account status
  if (moderator.deleted_at) {
    throw new HttpException("Account deleted", 403);
  }
  // 5. Create new session
  const accessExpires = new Date();
  accessExpires.setMinutes(accessExpires.getMinutes() + 15);
  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 7);
  const session = await MyGlobal.prisma.reddit_like_moderator_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_moderator_id: moderator.id,
      ip: props.ip,
      href: "/",
      referrer: null,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 6. Generate JWT tokens
  const accessPayload = {
    type: "moderator" as const,
    id: moderator.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: "moderator" as const,
    id: moderator.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: toISOStringSafe(new Date()),
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  const token = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  // 7. Return authorized moderator
  return {
    id: moderator.id,
    email: moderator.email,
    username: "",
    display_name: "",
    bio: "",
    avatar_url: "",
    karma_score: 0,
    email_verified_at: (moderator.email_verified_at
      ? toISOStringSafe(moderator.email_verified_at)
      : null) satisfies (string & tags.Format<"date-time">) | null as string &
      tags.Format<"date-time">,
    deleted_at: (moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null) satisfies (string & tags.Format<"date-time">) | null as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token,
  } satisfies IRedditLikeModerator.IAuthorized;
}
