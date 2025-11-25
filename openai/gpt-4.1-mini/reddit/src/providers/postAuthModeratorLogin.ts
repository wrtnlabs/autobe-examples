import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    },
  );

  if (moderator === null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowISOString = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowISOString,
        expired_at: accessExpires,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: nowISOString,
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
        created_at: nowISOString,
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

  return {
    id: moderator.id,
    email: moderator.email,
    created_at:
      moderator.created_at !== null
        ? toISOStringSafe(moderator.created_at!)
        : "",
    updated_at:
      moderator.updated_at !== null
        ? toISOStringSafe(moderator.updated_at!)
        : "",
    deleted_at:
      moderator.deleted_at !== null
        ? toISOStringSafe(moderator.deleted_at!)
        : "",
    token,
  };
}
