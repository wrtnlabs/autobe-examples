import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformSubscriptionAtSummaryTransformer } from "../transformers/RedditPlatformSubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberUsersUserIdSubscribedCommunities(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditPlatformSubscription.IRequest;
}): Promise<IPageIRedditPlatformSubscription.ISummary> {
  // Validate authenticated member matches the userId
  if (props.member.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify user exists in database
  const user = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: props.userId },
    select: { id: true },
  });
  if (user === null) {
    throw new HttpException("Not Found", 404);
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build search filter (case-insensitive name substring)
  const searchFilter = props.body.search?.trim();
  const hasSearchTerm =
    searchFilter !== undefined &&
    searchFilter !== "" &&
    !/^\s*$/.test(searchFilter);
  const whereInput: Prisma.reddit_platform_subscriptionsWhereInput = {
    deleted_at: null,
    user_id: props.userId,
    ...(hasSearchTerm
      ? {
          community: {
            name: {
              contains: searchFilter.trim().toLowerCase(),
              mode: "insensitive",
            },
          },
        }
      : {}),
  } satisfies Prisma.reddit_platform_subscriptionsWhereInput;
  // Build orderBy
  const sortBy = props.body.sort_by ?? "subscribed_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput =
    sortBy === "name"
      ? {
          community: {
            name: (sortOrder === "asc" ? "asc" : "desc") as Prisma.SortOrder,
          },
        }
      : sortBy === "subscriber_count"
        ? {
            community: {
              subscriber_count: (sortOrder === "asc"
                ? "asc"
                : "desc") as Prisma.SortOrder,
            },
          }
        : {
            subscribed_at: (sortOrder === "asc"
              ? "asc"
              : "desc") as Prisma.SortOrder,
          };
  const findManyArgs = {
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
  } satisfies Prisma.reddit_platform_subscriptionsFindManyArgs;
  // Query subscriptions with community details
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_subscriptions.findMany(findManyArgs),
    MyGlobal.prisma.reddit_platform_subscriptions.count({ where: whereInput }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformSubscriptionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditPlatformSubscription.ISummary;
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
// import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
// import { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberUsersUserIdSubscribedCommunities(props: {
//   member: MemberPayload;
//   userId: string & tags.Format<"uuid">;
//   body: IRedditPlatformSubscription.IRequest;
// }): Promise<IPageIRedditPlatformSubscription.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
//     ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformSubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------