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
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityCommunityOwnerCommunitiesSearch(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  if (props.body.search === undefined || props.body.search.length < 2) {
    throw new HttpException("SEARCH_TERM_TOO_SHORT", 400);
  }
  const search = props.body.search.toLowerCase();
  const where: Prisma.reddit_community_communitiesWhereInput = {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ],
  } satisfies Prisma.reddit_community_communitiesWhereInput;
  // Fetch communities with subscriber count
  const data = await MyGlobal.prisma.reddit_community_communities.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      created_at: true,
      updated_at: true,
      owner: RedditCommunityMemberAtSummaryTransformer.select(),
      _count: { select: { subscribers: true } },
    },
  });
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where,
  });
  // Sort data in memory based on sort type
  let sortedData = [...data];
  switch (props.body.sort) {
    case "top":
      sortedData.sort((a, b) => b._count.subscribers - a._count.subscribers);
      break;
    case "new":
      sortedData.sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime(),
      );
      break;
    case "hot":
    case "controversial":
    default:
      // For 'hot' and 'controversial', sort by creation date as fallback
      // These cannot be accurately computed without post/comment vote data
      sortedData.sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime(),
      );
      break;
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(sortedData, async (item) => {
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        icon_url: item.icon_url,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        owner: await RedditCommunityMemberAtSummaryTransformer.transform(
          item.owner,
        ),
        subscriber_count: item._count.subscribers,
      } satisfies IRedditCommunityCommunity;
    }),
  };
}
