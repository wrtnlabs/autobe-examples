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

export async function postAuthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityModerator.ICreate;
}): Promise<IRedditCommunityModerator.IAuthorized> {
  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: { email: props.body.email },
    });

  if (existingModerator) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowISOString = toISOStringSafe(new Date());

  const moderator = await MyGlobal.prisma.reddit_community_moderators.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowISOString satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updated_at: nowISOString satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        reddit_community_moderator_id: moderator.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        created_at: nowISOString satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        expired_at: toISOStringSafe(accessExpires) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        ip: "",
        href: "",
        referrer: "",
      },
    });

  const nowTokenISOString = toISOStringSafe(new Date());

  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: nowTokenISOString,
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
        created_at: nowTokenISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),

    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: moderator.id,
    email: moderator.email,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: null,
    token,
  };
}
