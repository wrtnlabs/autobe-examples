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

export async function postRedditCommunityAuthCommunityOwnerJoin(props: {
  body: IRedditCommunityCommunityOwner.IJoin;
}): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  // 1. Check if email already exists
  const existingOwner =
    await MyGlobal.prisma.reddit_community_community_owners.findFirst({
      where: { email: props.body.email },
    });
  if (existingOwner) throw new HttpException("Email already registered", 409);
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate UUID for owner
  const ownerId = v4();
  const now = toISOStringSafe(new Date());
  // 4. Create community owner
  const owner = await MyGlobal.prisma.reddit_community_community_owners.create({
    data: {
      id: ownerId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name ?? props.body.email.split("@")[0],
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Generate verification token
  const verificationToken = v4();
  const expiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 6. Create email verification record
  const verificationData = {
    reddit_community_community_owner_id: owner.id,
    token: verificationToken,
    expires_at: expiresAt,
    created_at: now,
    id: v4(),
  };
  await MyGlobal.prisma.reddit_community_community_owner_email_verifications.create(
    {
      data: verificationData,
    },
  );
  // 7. Generate refresh token (no access token yet — account unverified)
  const refresh = jwt.sign(
    {
      type: "communityOwner" as const,
      id: owner.id,
      session_id: "" as string & tags.Format<"uuid">,
      tokenType: "refresh" as const,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Return IAuthorized with refresh token only
  return {
    token: {
      access: null as never,
      refresh,
      expired_at: null as never,
      refreshable_until: expiresAt,
    },
  } satisfies IRedditCommunityCommunityOwner.IAuthorized;
}
