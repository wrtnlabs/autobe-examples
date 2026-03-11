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

export async function postRedditLikeAuthModeratorJoin(props: {
  ip: string;
  body: IRedditLikeModerator.IJoin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  const existingEmail = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) throw new HttpException("Email already registered", 409);
  const existingUsername =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) throw new HttpException("Username already taken", 409);
  const now = toISOStringSafe(new Date());
  const moderator = await MyGlobal.prisma.reddit_like_moderators.create({
    data: {
      id: v4(),
      email: props.body.email,
      username: props.body.username,
      display_name: props.body.display_name,
      password_hash: await PasswordUtil.hash(props.body.password),
      karma_score: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      karma_score: true,
    },
  });
  const emailToken = v4();
  const emailTokenHash = await PasswordUtil.hash(emailToken);
  const emailTokenExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.reddit_like_moderator_email_verifications.create({
    data: {
      id: v4(),
      moderator_id: moderator.id,
      token_hash: emailTokenHash,
      created_at: now,
      updated_at: now,
      expires_at: emailTokenExpires,
    },
  });
  const session = await MyGlobal.prisma.reddit_like_moderator_sessions.create({
    data: {
      id: v4(),
      moderator: { connect: { id: moderator.id } },
      ip: props.ip,
      href: props.ip, // Use IP as default href
      expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
      created_at: now,
    },
  });
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    ...moderator,
    token,
  } satisfies IRedditLikeModerator.IAuthorized;
}
