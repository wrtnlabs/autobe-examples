import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditLikeModeratorUsersUserIdProfile(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.IProfileUpdate;
}): Promise<IRedditLikeUser.IProfile> {
  const { moderator, userId, body } = props;

  // MANDATORY AUTHORIZATION: Moderators can ONLY edit their own profile
  if (moderator.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Verify user exists before attempting update
  await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: { id: userId },
  });

  // Prepare timestamp once for consistency
  const now = toISOStringSafe(new Date());

  // Update profile fields - inline data definition for clear type errors
  const updated = await MyGlobal.prisma.reddit_like_users.update({
    where: { id: userId },
    data: {
      profile_bio: body.profile_bio ?? undefined,
      avatar_url: body.avatar_url ?? undefined,
      updated_at: now,
    },
  });

  // Return profile with proper type conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    profile_bio: updated.profile_bio ?? undefined,
    avatar_url: updated.avatar_url ?? undefined,
    post_karma: updated.post_karma,
    comment_karma: updated.comment_karma,
    created_at: toISOStringSafe(updated.created_at),
  };
}
