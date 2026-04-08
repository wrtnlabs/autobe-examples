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
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesNameSubscribers(props: {
  name: string & tags.MinLength<3> & tags.MaxLength<50>;
  body: IRedditPlatformSubscription.IRequest;
}): Promise<IPageIRedditPlatformSubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const safeLimit = limit > 100 ? 100 : limit;
  const safePage = page < 1 ? 1 : page;
  const skip = (safePage - 1) * safeLimit;
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        name: props.name,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const [subscriptions, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where: {
        community_id: community.id,
        deleted_at: null,
      },
      select: {
        id: true,
        subscribed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
      skip,
      take: safeLimit,
      orderBy: {
        subscribed_at: "desc",
      },
    }),
    MyGlobal.prisma.reddit_platform_subscriptions.count({
      where: {
        community_id: community.id,
        deleted_at: null,
      },
    }),
  ]);
  const data = await ArrayUtil.asyncMap(subscriptions, async (subscription) => {
    const communitySummary =
      await RedditPlatformCommunityAtSummaryTransformer.transform(
        subscription.community,
      );
    return {
      id: subscription.id,
      community: communitySummary,
      created_at: subscription.created_at.toISOString(),
      deleted_at: subscription.deleted_at?.toISOString() ?? null,
      subscribed_at: subscription.subscribed_at?.toISOString() ?? undefined,
    } satisfies IRedditPlatformSubscription.ISummary;
  });
  const pages = total > 0 ? Math.ceil(total / safeLimit) : 0;
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data,
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
// export async function patchRedditPlatformCommunitiesNameSubscribers(props: {
//   name: string & tags.MinLength<3> & tags.MaxLength<50>;
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