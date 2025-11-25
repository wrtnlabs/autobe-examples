import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

export async function getRedditCommunityModeratorsUsernameKarma(props: {
  username: string;
}): Promise<IRedditCommunityModeratorKarma> {
  const moderator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { username: props.username },
      select: {
        post_karma: true,
        comment_karma: true,
      },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  const total_karma = moderator.post_karma + moderator.comment_karma;

  return {
    post_karma: moderator.post_karma,
    comment_karma: moderator.comment_karma,
    total_karma,
  };
}
