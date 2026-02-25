import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorModeratorsUserId(props: {
  communityModerator: CommunitymoderatorPayload;
  userId: string;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  const page = 1;
  const limit = 25;
  const skip = (page - 1) * limit;
  const moderators = await MyGlobal.prisma.reddit_community_moderators.findMany(
    {
      where: {
        user_id: props.userId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "asc",
      },
      ...RedditCommunityModeratorAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_community_moderators.count({
    where: {
      user_id: props.userId,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      moderators,
      RedditCommunityModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
