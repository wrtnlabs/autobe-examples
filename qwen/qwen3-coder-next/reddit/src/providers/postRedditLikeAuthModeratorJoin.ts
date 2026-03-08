import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthModeratorJoin(props: {
  body: IRedditLikeModerator.IJoin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // 1. Check duplicate email
  const existingModeratorByEmail =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: { email: props.body.email },
    });
  if (existingModeratorByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check duplicate username
  const existingModeratorByUsername =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: { username: props.body.username },
    });
  if (existingModeratorByUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Generate IDs
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4();
  const hashedToken = await PasswordUtil.hash(verificationToken);
  const verificationRecordId = v4() as string & tags.Format<"uuid">;
  // 4. Create moderator record
  const moderator = await MyGlobal.prisma.reddit_like_moderators.create({
    data: {
      id: moderatorId,
      email: props.body.email,
      email_verified_at: null,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.display_name,
      bio: props.body.bio,
      avatar_url: props.body.avatar_url,
      karma_score: 0,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at: null,
    },
  });
  // 5. Create email verification record
  await MyGlobal.prisma.reddit_like_moderator_email_verifications.create({
    data: {
      id: verificationRecordId,
      moderator_id: moderatorId,
      token_hash: hashedToken,
      expires_at: toISOStringSafe(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ) as string & tags.Format<"date-time">,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at: null,
    },
  });
  // 6. Build response without sensitive verification info
  return {
    id: moderator.id,
    email: moderator.email,
    email_verified_at: moderator.email_verified_at
      ? (toISOStringSafe(moderator.email_verified_at) as string &
          tags.Format<"date-time">)
      : ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
    username: moderator.username,
    display_name: moderator.display_name,
    bio: moderator.bio ?? "",
    avatar_url: moderator.avatar_url ?? "",
    karma_score: moderator.karma_score,
    created_at: toISOStringSafe(moderator.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(moderator.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: moderator.deleted_at
      ? (toISOStringSafe(moderator.deleted_at) as string &
          tags.Format<"date-time">)
      : ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
    token: {
      access: "verification_required",
      refresh: "verification_required",
      expired_at: "1970-01-01T00:00:00.000Z" as string &
        tags.Format<"date-time">,
      refreshable_until: "1970-01-01T00:00:00.000Z" as string &
        tags.Format<"date-time">,
    },
  } satisfies IRedditLikeModerator.IAuthorized;
}
