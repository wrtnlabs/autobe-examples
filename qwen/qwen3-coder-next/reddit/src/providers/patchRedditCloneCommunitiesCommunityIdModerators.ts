import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "../transformers/RedditCloneModeratorAtSummaryTransformer";
import { RedditCloneOwnerAtSummaryTransformer } from "../transformers/RedditCloneOwnerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdModerators(props: {
  communityId: string;
}): Promise<IPageIRedditCloneCommunityModerator> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_clone_community_moderators.findMany(
    {
      where: { community_id: props.communityId },
      skip,
      take: limit,
      orderBy: { appointed_at: "desc" },
      select: {
        id: true,
        community_id: true,
        moderator_id: true,
        appointer_id: true,
        appointed_at: true,
        appointment_reason: true,
        community: true,
        moderator: true,
        appointer: true,
      },
    },
  );
  const total = await MyGlobal.prisma.reddit_clone_community_moderators.count({
    where: { community_id: props.communityId },
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (m) => ({
      id: m.id,
      community_id: m.community_id,
      moderator_id: m.moderator_id,
      appointer_id: m.appointer_id,
      appointed_at: m.appointed_at.toISOString(),
      appointment_reason: m.appointment_reason ?? undefined,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        m.community,
      ),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        m.moderator,
      ),
      appointer: await RedditCloneOwnerAtSummaryTransformer.transform(
        m.appointer,
      ),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
