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
import { RedditPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/RedditPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityModerator.ISummary[]> {
  const moderators =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        community_id: props.communityId,
        user: {
          deleted_at: null,
        },
      },
      ...RedditPlatformCommunityModeratorAtSummaryTransformer.select(),
      orderBy: {
        created_at: "asc",
      },
    });
  return await ArrayUtil.asyncMap(
    moderators,
    RedditPlatformCommunityModeratorAtSummaryTransformer.transform,
  );
}
