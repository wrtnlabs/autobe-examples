import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditLikeCommunityCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityMemberUsersUserIdSubscriptions(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityCommunitySubscription.IRequest;
}): Promise<IPageIRedditLikeCommunityCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    member_id: props.userId,
    deleted_at: null,
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.joinedAtStart && {
      joined_at: { gte: new Date(props.body.joinedAtStart) },
    }),
    ...(props.body.joinedAtEnd && {
      joined_at: { lte: new Date(props.body.joinedAtEnd) },
    }),
  } satisfies Prisma.reddit_like_community_community_subscriptionsWhereInput;
  const records =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.findMany(
      {
        where: whereInput,
        ...RedditLikeCommunityCommunitySubscriptionAtSummaryTransformer.select(),
        skip,
        take: limit,
        orderBy: { joined_at: "desc" },
      },
    );
  const total =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.count({
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
      RedditLikeCommunityCommunitySubscriptionAtSummaryTransformer.transform,
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
// import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
// import { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityMemberUsersUserIdSubscriptions(props: {
//   member: MemberPayload;
//   userId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityCommunitySubscription.IRequest;
// }): Promise<IPageIRedditLikeCommunityCommunitySubscription.ISummary> {
//   const records = await MyGlobal.prisma.reddit_like_community_community_subscriptions.findMany({
//     ...RedditLikeCommunityCommunitySubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditLikeCommunityCommunitySubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------