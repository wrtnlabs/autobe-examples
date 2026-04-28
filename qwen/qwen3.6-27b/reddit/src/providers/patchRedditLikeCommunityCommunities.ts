import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "../transformers/REdditLikeCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityCommunities(props: {
  body: IREdditLikeCommunityCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunityCommunity.ISummary> {
  const body = props.body;
  const page = body.page != null ? body.page : 1;
  const limit = body.limit != null ? body.limit : 50;
  const skip = (page - 1) * limit;
  // Build WHERE clause conditions
  const conditions: Prisma.reddit_like_community_communitiesWhereInput[] = [
    { deleted_at: null },
  ];
  if (body.search != null && body.search.trim().length > 0) {
    conditions.push({
      OR: [
        { name: { contains: body.search.trim(), mode: "insensitive" } },
        { description: { contains: body.search.trim(), mode: "insensitive" } },
      ],
    });
  }
  if (body.name != null && body.name.trim().length > 0) {
    conditions.push({
      name: { contains: body.name.trim(), mode: "insensitive" },
    });
  }
  if (body.description != null && body.description.trim().length > 0) {
    conditions.push({
      description: { contains: body.description.trim(), mode: "insensitive" },
    });
  }
  const where =
    conditions.length === 1
      ? conditions[0]
      : ({
          AND: conditions,
        } satisfies Prisma.reddit_like_community_communitiesWhereInput);
  // Determine sorting strategy
  const sortBy = body.sort_by ?? "newest";
  const isMostSubscribed = sortBy === "most_subscribed";
  const orderBy = (
    sortBy === "most_subscribed"
      ? { created_at: "desc" as const } // placeholder
      : sortBy === "name_asc"
        ? { name: "asc" as const }
        : sortBy === "name_desc"
          ? { name: "desc" as const }
          : sortBy === "oldest"
            ? { created_at: "asc" as const }
            : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_like_community_communitiesOrderByWithRelationInput;
  // Fetch communities - different strategy for most_subscribed
  const transformerSelect =
    REdditLikeCommunityCommunityAtSummaryTransformer.select();
  let data;
  if (isMostSubscribed) {
    data = await MyGlobal.prisma.reddit_like_community_communities.findMany({
      where,
      ...transformerSelect,
      orderBy,
      skip: 0,
    });
  } else {
    data = await MyGlobal.prisma.reddit_like_community_communities.findMany({
      where,
      ...transformerSelect,
      orderBy,
      skip,
      take: limit,
    });
  }
  // App-level sorting for most_subscribed
  if (isMostSubscribed) {
    data = data
      .map((community) => ({
        community,
        subscriberCount: community.subscriptions.filter(
          (s) => s.is_active && s.deleted_at == null,
        ).length,
      }))
      .sort((a, b) => b.subscriberCount - a.subscriberCount)
      .slice(skip, skip + limit)
      .map((item) => item.community);
  }
  // Total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_like_community_communities.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      REdditLikeCommunityCommunityAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityCommunities(props: {
//   body: IREdditLikeCommunityCommunity.IRequest;
// }): Promise<IPageIRedditLikeCommunityCommunity.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityCommunityAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------