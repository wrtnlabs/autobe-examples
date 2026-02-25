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
  ip: string;
  body: IRedditCommunityCommunityOwner.ILogin;
}): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  const owner =
    await MyGlobal.prisma.reddit_community_community_owners.findFirst({
      where: { email: props.body.email, is_deleted: false },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        password_hash: true,
      },
    });
  if (!owner) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Delete all existing sessions for this owner
  await MyGlobal.prisma.reddit_community_community_owner_sessions.deleteMany({
    where: { reddit_community_community_owner_id: owner.id },
  });
  // Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_community_owner_sessions.create({
      data: {
        id: v4(),
        reddit_community_community_owner_id: owner.id,
        ip: props.ip ?? "",
        href: "",
        referrer: null,
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "communityOwner",
        id: owner.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
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
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: owner.id,
    email: owner.email,
    username: owner.username,
    display_name: owner.display_name,
    bio: owner.bio,
    avatar_url: owner.avatar_url,
    karma_score: owner.karma_score,
    is_deleted: owner.is_deleted,
    created_at: toISOStringSafe(owner.created_at),
    updated_at: toISOStringSafe(owner.updated_at),
    token,
  } satisfies IRedditCommunityCommunityOwner.IAuthorized;
}
