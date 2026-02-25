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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityCommunityModeratorCommunitiesCommunityIdModerators(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  // Verify community exists and user has authority to view moderators
  const isAuthorized =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.communityModerator.id,
      },
    });
  const communityOwner =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        id: props.communityId,
        owner_user_id: props.communityModerator.id, // Corrected from owner_id to owner_user_id
      },
    });
  if (!isAuthorized && !communityOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch all moderators for the community
  const moderators = await MyGlobal.prisma.reddit_community_moderators.findMany(
    {
      where: {
        community_id: props.communityId,
      },
      orderBy: {
        created_at: "asc",
      },
      ...RedditCommunityModeratorAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_community_moderators.count({
    where: {
      community_id: props.communityId,
    },
  });
  const transformed = await ArrayUtil.asyncMap(
    moderators,
    RedditCommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: 1,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityModerator.ISummary;
}
