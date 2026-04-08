import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySubscriptionCollector } from "../collectors/RedditCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionTransformer } from "../transformers/RedditCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCommunitySubscription.ICreate;
}): Promise<IRedditCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: {
        id: props.body.reddit_community_communities_id,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const existingSubscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: {
        reddit_community_member_id_reddit_community_communities_id: {
          reddit_community_member_id: props.member.id,
          reddit_community_communities_id:
            props.body.reddit_community_communities_id,
        },
      },
    });
  if (
    existingSubscription !== null &&
    existingSubscription.status === "active"
  ) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const record = await MyGlobal.prisma.reddit_community_subscriptions.create({
    data: await RedditCommunitySubscriptionCollector.collect({
      body: props.body,
      redditCommunityMembers: {
        id: props.member.id,
      },
    }),
    ...RedditCommunitySubscriptionTransformer.select(),
  });
  return await RedditCommunitySubscriptionTransformer.transform(record);
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
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityMemberSubscriptions(props: {
//   member: MemberPayload;
//   body: IRedditCommunitySubscription.ICreate;
// }): Promise<IRedditCommunitySubscription> {
//   const record = await MyGlobal.prisma.reddit_community_subscriptions.create({
//     data: await RedditCommunitySubscriptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunitySubscriptionTransformer.select(),
//   });
//   return await RedditCommunitySubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------