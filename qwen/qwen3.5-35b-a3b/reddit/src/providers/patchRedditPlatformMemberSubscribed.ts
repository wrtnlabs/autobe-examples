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

export async function patchRedditPlatformMemberSubscribed(props: {
  member: MemberPayload;
  body: IRedditPlatformSubscription.IRequest;
}): Promise<IPageIRedditPlatformSubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Invalid page number", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  const whereInput: Prisma.reddit_platform_subscriptionsWhereInput = {
    user_id: props.member.id,
    deleted_at: null,
    ...(props.body.subscribed_at_gte && {
      subscribed_at: { gte: new Date(props.body.subscribed_at_gte) },
    }),
    ...(props.body.subscribed_at_lte && {
      subscribed_at: { lte: new Date(props.body.subscribed_at_lte) },
    }),
    ...(props.body.community_id && {
      community_id: props.body.community_id,
    }),
    ...(props.body.community_name && {
      community: {
        name: {
          contains: props.body.community_name,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.reddit_platform_subscriptionsWhereInput;
  const sortOrder = (props.body.sort_order ?? "desc") as "asc" | "desc";
  const orderByInput = (
    props.body.sort_by === "created_at"
      ? { created_at: sortOrder }
      : { subscribed_at: sortOrder }
  ) satisfies Prisma.reddit_platform_subscriptionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: (page - 1) * limit,
    take: limit,
    ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_subscriptions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformSubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
// import { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberSubscribed(props: {
//   member: MemberPayload;
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