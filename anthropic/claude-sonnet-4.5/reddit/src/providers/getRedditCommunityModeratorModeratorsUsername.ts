import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorModeratorsUsername(props: {
  moderator: ModeratorPayload;
  username: string;
}): Promise<IRedditCommunityCommunityModerator.ISummary> {
  const found = await MyGlobal.prisma.reddit_community_moderators.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });

  if (!found) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: found.id,
    username: found.username,
    display_name: found.display_name,
    avatar_url: found.avatar_url,
    post_karma: found.post_karma,
    comment_karma: found.comment_karma,
    created_at: toISOStringSafe(found.created_at),
  };
}
