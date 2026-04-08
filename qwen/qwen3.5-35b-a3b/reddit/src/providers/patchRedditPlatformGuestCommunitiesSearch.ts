import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestCommunitiesSearch(props: {
  guest: GuestPayload;
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = (props.body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip: number = (page - 1) * limit;
  // Build base filter
  const baseFilter: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
  };
  // Add search filter (prefer q over name_search)
  const searchQuery: string = props.body.q ?? props.body.name_search ?? "";
  if (searchQuery.trim().length > 0) {
    baseFilter.name = {
      contains: searchQuery.trim(),
      mode: "insensitive" as const,
    };
  }
  // Build sort order
  const sortBy: "subscriber_count" | "created_at" | "name" =
    props.body.sortBy ?? "subscriber_count";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.reddit_platform_communitiesOrderByWithRelationInput =
    sortBy === "subscriber_count"
      ? {
          communityMemberships: {
            _count: sortOrder,
          },
        }
      : ({
          [sortBy]: sortOrder,
        } satisfies Prisma.reddit_platform_communitiesOrderByWithRelationInput);
  // Execute parallel queries
  const [rawRecords, totalRecords]: [
    Array<RedditPlatformCommunityAtSummaryTransformer.Payload>,
    number,
  ] = await Promise.all([
    MyGlobal.prisma.reddit_platform_communities.findMany({
      where: baseFilter,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformCommunityAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_communities.count({
      where: baseFilter,
    }),
  ]);
  // Filter by subscriber count range
  const minSubscribers: number | undefined = props.body.min_subscribers;
  const maxSubscribers: number | undefined = props.body.max_subscribers;
  const filteredRecords: Array<RedditPlatformCommunityAtSummaryTransformer.Payload> =
    rawRecords.filter((record) => {
      const subscriberCount: number = record.communityMemberships.length;
      if (minSubscribers !== undefined && subscriberCount < minSubscribers) {
        return false;
      }
      if (maxSubscribers !== undefined && subscriberCount > maxSubscribers) {
        return false;
      }
      return true;
    });
  // Calculate pagination based on filtered results
  const currentRecords: number = filteredRecords.length;
  const currentPages: number =
    currentRecords === 0 ? 0 : Math.ceil(currentRecords / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: currentRecords,
      pages: currentPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      filteredRecords,
      RedditPlatformCommunityAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformCommunity.ISummary;
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
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformGuestCommunitiesSearch(props: {
//   guest: GuestPayload;
//   body: IRedditPlatformCommunity.IRequest;
// }): Promise<IPageIRedditPlatformCommunity.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_communities.findMany({
//     ...RedditPlatformCommunityAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommunityAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------