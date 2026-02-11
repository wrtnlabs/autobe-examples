import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityModeratorLogin(props: {
  body: IRedditCommunityCommunityModerator.ILogin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        password_hash: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!moderator) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.create({
      data: {
        id: v4(),
        community_moderator_id: moderator.id,
        ip: (props as any).ip ?? null,
        href: (props as any).href ?? null,
        referrer: (props as any).referrer ?? null,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "communityModerator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "communityModerator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    access_token: token.access,
    refresh_token: token.refresh,
    expires_in: 900,
    token,
  } satisfies IRedditCommunityCommunityModerator.IAuthorized;
}
