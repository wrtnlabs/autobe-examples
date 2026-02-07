import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorsModeratorId(props: {
  moderatorId: string;
}): Promise<IRedditPlatformModerator> {
  const moderator = await MyGlobal.prisma.reddit_platform_moderators.findUnique(
    {
      where: {
        id: props.moderatorId as string & tags.Format<"uuid">,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }
  return {
    id: moderator.id,
    user_id: moderator.user_id,
    display_name: moderator.display_name,
    bio: moderator.bio === null ? undefined : moderator.bio,
    avatar_url:
      moderator.avatar_url === null ? undefined : moderator.avatar_url,
    karma_score: moderator.karma_score,
    status: moderator.status,
    created_at: toISOStringSafe(moderator.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(moderator.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      moderator.deleted_at === null
        ? undefined
        : (toISOStringSafe(moderator.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
