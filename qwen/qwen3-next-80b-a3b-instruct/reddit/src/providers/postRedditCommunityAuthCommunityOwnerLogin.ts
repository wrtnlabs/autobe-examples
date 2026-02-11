import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityOwnerLogin(props: {
  body: IRedditCommunityCommunityOwner.ILogin;
  ip: string;
  href: string;
  referrer: string;
}): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  const owner =
    await MyGlobal.prisma.reddit_community_community_owners.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        password_hash: true,
      },
    });
  if (!owner) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_community_owner_sessions.create({
      data: {
        id: v4(),
        reddit_community_community_owner_id: owner.id,
        ip: props.ip ?? "",
        href: props.href ?? "",
        referrer: props.referrer ?? "",
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "communityOwner",
        id: owner.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "communityOwner",
        id: owner.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  return {
    token,
  } satisfies IRedditCommunityCommunityOwner.IAuthorized;
}
