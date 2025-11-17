import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUserKarma";

export async function getCommunityForumUsersUsernameKarma(props: {
  username: string;
}): Promise<ICommunityForumCommunityUserKarma> {
  // Find the user by username
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { username: props.username },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Find the user's karma record
  const karmaRecord =
    await MyGlobal.prisma.community_forum_user_karma.findUnique({
      where: { community_forum_user_id: user.id },
    });

  if (!karmaRecord) {
    throw new HttpException("Karma record not found for user", 404);
  }

  // Calculate total karma
  const total_karma = karmaRecord.post_karma + karmaRecord.comment_karma;

  // Return the karma information
  return {
    id: karmaRecord.id,
    community_forum_user_id: karmaRecord.community_forum_user_id,
    post_karma: karmaRecord.post_karma,
    comment_karma: karmaRecord.comment_karma,
    total_karma,
    created_at: toISOStringSafe(karmaRecord.created_at),
    updated_at: toISOStringSafe(karmaRecord.updated_at),
    deleted_at: karmaRecord.deleted_at
      ? toISOStringSafe(karmaRecord.deleted_at)
      : null,
  };
}
