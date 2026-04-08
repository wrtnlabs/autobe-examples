import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneSubscriptionAtSummaryTransformer } from "../transformers/RedditCloneSubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCloneSubscription.IRequest;
}): Promise<IPageIRedditCloneSubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const order = props.body.order ?? "desc";
  const whereClause = {
    reddit_clone_member_id: props.member.id,
    community: {
      deleted_at: null,
      ...(props.body.search && {
        name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
    },
  } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
  const records = await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: order },
    ...RedditCloneSubscriptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_subscriptions.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneSubscriptionAtSummaryTransformer.transform,
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
// import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
// import { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberSubscriptions(props: {
//   member: MemberPayload;
//   body: IRedditCloneSubscription.IRequest;
// }): Promise<IPageIRedditCloneSubscription.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
//     ...RedditCloneSubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneSubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------