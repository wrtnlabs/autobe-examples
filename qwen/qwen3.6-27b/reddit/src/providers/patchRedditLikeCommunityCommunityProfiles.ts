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

export async function patchRedditLikeCommunityCommunityProfiles(props: {
  body: IREdditLikeCommunityCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunityCommunity.ISummary> {
  const pageNum = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (pageNum - 1) * clampedLimit;
  const sortBy = props.body.sort_by ?? "newest";
  const whereInput = {
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {
          ...(props.body.name && {
            name: { contains: props.body.name, mode: "insensitive" },
          }),
          ...(props.body.description && {
            description: {
              contains: props.body.description,
              mode: "insensitive",
            },
          }),
        }),
  } satisfies Prisma.reddit_like_community_communitiesWhereInput;
  if (sortBy === "most_subscribed") {
    const allData =
      await MyGlobal.prisma.reddit_like_community_communities.findMany({
        where: whereInput,
        ...REdditLikeCommunityCommunityAtSummaryTransformer.select(),
      });
    const totalCount = allData.length;
    const transformed = await ArrayUtil.asyncMap(
      allData,
      REdditLikeCommunityCommunityAtSummaryTransformer.transform,
    );
    transformed.sort((a, b) => b.subscriber_count - a.subscriber_count);
    const pagedData = transformed.slice(skip, skip + clampedLimit);
    return {
      data: pagedData,
      pagination: {
        current: pageNum,
        limit: clampedLimit,
        records: totalCount,
        pages: totalCount === 0 ? 0 : Math.ceil(totalCount / clampedLimit),
      } satisfies IPage.IPagination,
    };
  }
  const direction: "asc" | "desc" = sortBy === "oldest" ? "asc" : "desc";
  const orderBy = {
    created_at: direction,
  } satisfies Prisma.reddit_like_community_communitiesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_like_community_communities.findMany(
    {
      where: whereInput,
      orderBy,
      skip,
      take: clampedLimit,
      ...REdditLikeCommunityCommunityAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_like_community_communities.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      REdditLikeCommunityCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: pageNum,
      limit: clampedLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / clampedLimit),
    } satisfies IPage.IPagination,
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
// export async function patchRedditLikeCommunityCommunityProfiles(props: {
//   body: IREdditLikeCommunityCommunity.IRequest;
// }): Promise<IPageIRedditLikeCommunityCommunity.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityCommunityAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------