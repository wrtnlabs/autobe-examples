import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorLogin(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityModerator.ILogin;
}): Promise<IRedditCommunityModerator.IAuthorized> {
  const user = await MyGlobal.prisma.reddit_community_user.findFirst({
    where: { email: props.body.email },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const moderator = await MyGlobal.prisma.reddit_community_moderator.findFirst({
    where: { user_id: user.id },
  });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: v4(),
        reddit_community_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  const createdAt = nowIso;

  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: moderator.id,
    user_id: user.id,
    created_at: toISOStringSafe(user.created_at),
    email: user.email ?? undefined,
    token,
    updated_at: user.updated_at ? toISOStringSafe(user.updated_at) : undefined,
  };
}
