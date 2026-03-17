import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityBanAtSummaryTransformer } from "../transformers/RedditCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdBans(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityBan.ISummary> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true, deleted_at: true },
    });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Build WHERE clause
  const whereInput: Prisma.reddit_community_bansWhereInput = {
    reddit_community_id: props.communityId,
    deleted_at: null,
    banned_at: {
      ...(props.body.banned_at_from !== undefined && {
        gte: props.body.banned_at_from,
      }),
      ...(props.body.banned_at_to !== undefined && {
        lte: props.body.banned_at_to,
      }),
    },
    banned_by_moderator_id: props.body.banned_by_moderator_id,
  } satisfies Prisma.reddit_community_bansWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_bans.count({
    where: whereInput,
  });
  // Get paginated data
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
    ...RedditCommunityBanAtSummaryTransformer.select(),
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
