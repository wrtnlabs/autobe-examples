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

export async function postRedditCommunityAuthCommunityModeratorJoin(props: {
  body: IRedditCommunityCommunityModerator.IJoin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  // Check for existing moderator
  const existing =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // Generate actor ID
  const id = v4() as string & tags.Format<"uuid">;
  // Create moderator record
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.create({
      data: {
        id,
        email: props.body.email,
        password_hash: props.body.password_hash,
        display_name: props.body.display_name ?? "Anonymous Moderator",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Generate verification token
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // Insert verification record
  await MyGlobal.prisma.reddit_community_community_moderator_email_verifications.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_moderator_id: moderator.id,
        token: verificationToken,
        expires_at: toISOStringSafe(expiresAt),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  // Return IAuthorized with tokens as per structure, but as per specification, the tokens are NOT issued yet.
  // However, specification says response should be IAuthorized, so we initialize it with empty/ignored values.
  return {
    access_token: "",
    refresh_token: "",
    expires_in: 0,
    token: {
      access: "",
      refresh: "",
      expired_at: toISOStringSafe(new Date(0)),
      refreshable_until: toISOStringSafe(new Date(0)),
    },
  } satisfies IRedditCommunityCommunityModerator.IAuthorized;
}
