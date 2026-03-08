import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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

export async function patchRedditPlatformCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.IRequest;
}): Promise<IPageIRedditPlatformCommunityModerator.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
    select: { id: true },
  });
  // Parse pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_platform_community_moderatorsWhereInput = {
    reddit_platform_community_id: props.communityId,
    deleted_at: null,
  };
  // Add search filter if provided
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.member = {
      OR: [
        { username: { contains: props.body.search } },
        { display_name: { contains: props.body.search } },
      ],
    };
  }
  // Execute query for moderators
  const moderators =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditPlatformCommunityModeratorAtSummaryTransformer.select(),
    });
  // Execute count for total
  const total =
    await MyGlobal.prisma.reddit_platform_community_moderators.count({
      where: whereInput,
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    moderators,
    RedditPlatformCommunityModeratorAtSummaryTransformer.transform,
  );
  // Calculate pages
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: data,
  };
}
