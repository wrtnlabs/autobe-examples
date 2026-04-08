import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_subscriptionsWhereInput = {
    reddit_community_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.status !== undefined && props.body.status !== "all"
      ? { status: props.body.status }
      : {}),
    ...(props.body.search !== undefined && props.body.search.trim().length > 0
      ? {
          community: {
            OR: [
              { name: { contains: props.body.search, mode: "insensitive" } },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          },
        }
      : {}),
    ...(props.body.startDate !== undefined || props.body.endDate !== undefined
      ? {
          AND: [
            ...(props.body.startDate !== undefined
              ? [{ created_at: { gte: new Date(props.body.startDate) } }]
              : []),
            ...(props.body.endDate !== undefined
              ? [{ created_at: { lte: new Date(props.body.endDate) } }]
              : []),
          ],
        }
      : {}),
  };
  const direction: Prisma.SortOrder =
    props.body.direction === "ASC" ? "asc" : "desc";
  const orderByInput: Prisma.reddit_community_subscriptionsOrderByWithRelationInput[] =
    props.body.sort !== undefined
      ? props.body.sort === "created_at"
        ? [{ created_at: direction }]
        : props.body.sort === "community_name"
          ? [{ community: { name: direction } }]
          : props.body.sort === "subscriber_count"
            ? [{ created_at: "desc" }]
            : [{ created_at: "desc" }]
      : [{ created_at: "desc" }];
  const records = await MyGlobal.prisma.reddit_community_subscriptions.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_community_subscriptions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunitySubscriptionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunitySubscription.ISummary;
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
// import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
// import { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberSubscriptions(props: {
//   member: MemberPayload;
//   body: IRedditCommunitySubscription.IRequest;
// }): Promise<IPageIRedditCommunitySubscription.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_subscriptions.findMany({
//     ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunitySubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------