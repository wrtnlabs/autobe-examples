import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityNameModeratorsUserId(props: {
  admin: AdminPayload;
  communityName: string;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityModerator> {
  // Step 1: Find community by name to get community_id
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
      },
      select: { id: true },
    });
  // Step 2: Query moderator record with relations using compound unique constraint
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUniqueOrThrow(
      {
        where: {
          community_id_user_id: {
            community_id: community.id,
            user_id: props.userId,
          },
        },
        ...RedditPlatformCommunityModeratorTransformer.select(),
      },
    );
  // Step 3: Transform to DTO
  return await RedditPlatformCommunityModeratorTransformer.transform(moderator);
}
