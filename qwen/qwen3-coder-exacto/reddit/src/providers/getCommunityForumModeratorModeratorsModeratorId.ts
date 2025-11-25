import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityForumModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumCommunityModerator> {
  const moderator = await MyGlobal.prisma.community_forum_moderators.findUnique(
    {
      where: {
        id: props.moderatorId,
      },
      include: {
        user: true,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: moderator.id,
    community_forum_user_id: moderator.community_forum_user_id,
    user: {
      id: moderator.user.id,
      username: moderator.user.username,
    },
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
  };
}
