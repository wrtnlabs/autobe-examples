import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityCommunityModeratorCommunitiesSearch(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity> {
  const search = props.body.search?.trim();
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  if (search === undefined || search.length < 2) {
    throw new HttpException("SEARCH_TERM_TOO_SHORT", 400);
  }
  const offset = (page - 1) * limit;
  // Use transformer's select() to define exact Prisma query structure
  const selectStructure = RedditCommunityCommunityTransformer.select();
  // Build WHERE clause with case-insensitive partial matching
  const where: Prisma.reddit_community_communitiesWhereInput = {
    AND: [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ],
  };
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where: where,
  });
  // Fetch paginated communities using transformer's exact select structure
  const data = await MyGlobal.prisma.reddit_community_communities.findMany({
    where: where,
    orderBy: [{ name: "desc" }, { created_at: "desc" }],
    skip: offset,
    take: limit,
    ...selectStructure, // ✅ Apply transformer's select() to enforce correct field structure
  });
  // Transform results using transformer - now data matches transformer input exactly
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommunityTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
