import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModeratorTransformer } from "../transformers/RedditCloneModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthModeratorJoin(props: {
  ip: string;
  body: IRedditCloneModerator.IJoin;
}): Promise<IRedditCloneModerator.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  // 3. Create member with email, password, and username derived from display_name
  const member = await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.display_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create user profile linked to member
  const userProfile = await MyGlobal.prisma.reddit_clone_user_profiles.create({
    data: {
      id: v4(),
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      avatar: props.body.avatar ?? null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: { id: member.id },
      },
    },
  });
  // 5. Create moderator linked to user profile
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      reddit_clone_user_profile_id: userProfile.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...RedditCloneModeratorTransformer.select(),
  });
  // 6. Create session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_moderator_sessions.create({
    data: {
      id: v4(),
      reddit_clone_moderator_id: moderator.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 7. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 8. Return IAuthorized
  const transformedModerator =
    await RedditCloneModeratorTransformer.transform(moderator);
  return {
    ...transformedModerator,
    token,
  };
}
