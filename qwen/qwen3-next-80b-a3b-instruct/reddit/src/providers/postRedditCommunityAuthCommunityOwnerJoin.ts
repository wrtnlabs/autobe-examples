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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityAuthCommunityOwnerJoin(props: {
  body: IRedditCommunityCommunityOwner.IJoin;
}): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  const existing =
    await MyGlobal.prisma.reddit_community_community_owners.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  const ownerId = v4();
  const createdNow = new Date();
  const owner = await MyGlobal.prisma.reddit_community_community_owners.create({
    data: {
      id: ownerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.email.toLowerCase().split("@")[0],
      display_name: props.body.displayName,
      created_at: createdNow.toISOString(),
      updated_at: createdNow.toISOString(),
      karma_score: 0,
      is_deleted: false,
    },
  });
  const accessExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_community_owner_sessions.create({
      data: {
        id: v4(),
        created_at: createdNow.toISOString(),
        expired_at: accessExpires.toISOString(),
        communityOwner: { connect: { id: owner.id } },
        ip: "", // default value since not provided in IJoin
        href: "", // default value since not provided in IJoin
      } satisfies Prisma.reddit_community_community_owner_sessionsCreateInput,
    });
  const token = {
    access: jwt.sign(
      {
        type: "communityOwner",
        id: owner.id,
        session_id: session.id,
        created_at: createdNow.toISOString(),
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
        created_at: createdNow.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  const verificationToken = v4();
  await MyGlobal.prisma.reddit_community_community_owner_email_verifications.create(
    {
      data: {
        id: verificationToken,
        communityOwner: { connect: { id: owner.id } },
        token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: createdNow.toISOString(),
        updated_at: createdNow.toISOString(),
        is_used: false,
      } satisfies Prisma.reddit_community_community_owner_email_verificationsCreateInput,
    },
  );
  const transformedOwner = {
    id: owner.id,
    email: owner.email,
    username: owner.username,
    display_name: owner.display_name,
    bio: owner.bio ?? null,
    avatar_url: owner.avatar_url ?? null,
    karma_score: owner.karma_score,
    is_deleted: owner.is_deleted,
    created_at: owner.created_at.toISOString(),
    updated_at: owner.updated_at.toISOString(),
    token,
  } satisfies IRedditCommunityCommunityOwner.IAuthorized;
  return transformedOwner;
}
