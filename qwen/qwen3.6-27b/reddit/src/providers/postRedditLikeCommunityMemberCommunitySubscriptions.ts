import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditLikeCommunityCommunitySubscriptionCollector } from "../collectors/RedditLikeCommunityCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommunitySubscriptionTransformer } from "../transformers/RedditLikeCommunityCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberCommunitySubscriptions(props: {
  member: MemberPayload;
  body: IRedditLikeCommunityCommunitySubscription.ICreate;
}): Promise<IRedditLikeCommunityCommunitySubscription> {
  await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
    where: {
      id: props.body.community_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const existingSubscription =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.findFirst(
      {
        where: {
          member_id: props.member.id,
          community_id: props.body.community_id,
          is_active: true,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
  if (existingSubscription !== null) {
    throw new HttpException(
      "Member is already subscribed to this community",
      409,
    );
  }
  const record =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.create({
      data: await RedditLikeCommunityCommunitySubscriptionCollector.collect({
        body: props.body,
        redditLikeCommunityMembers: props.member,
      }),
      ...RedditLikeCommunityCommunitySubscriptionTransformer.select(),
    });
  return await RedditLikeCommunityCommunitySubscriptionTransformer.transform(
    record,
  );
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
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberCommunitySubscriptions(props: {
//   member: MemberPayload;
//   body: IRedditLikeCommunityCommunitySubscription.ICreate;
// }): Promise<IRedditLikeCommunityCommunitySubscription> {
//   const record = await MyGlobal.prisma.reddit_like_community_community_subscriptions.create({
//     data: await RedditLikeCommunityCommunitySubscriptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditLikeCommunityCommunitySubscriptionTransformer.select(),
//   });
//   return await RedditLikeCommunityCommunitySubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------