import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityModeratorDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorDetail";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityModeratorDetail> {
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUniqueOrThrow(
      {
        where: {
          community_id_user_id: {
            community_id: props.communityId,
            user_id: props.moderatorId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              display_name: true,
              bio: true,
              karma_score: true,
              is_active: true,
              created_at: true,
            },
          },
        },
      },
    );
  return {
    id: moderator.id,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    user: {
      id: moderator.user.id,
      username: moderator.user.username,
      display_name: moderator.user.display_name,
      karma_score: moderator.user.karma_score,
      is_active: moderator.user.is_active,
      created_at: toISOStringSafe(moderator.user.created_at),
    },
  };
}
