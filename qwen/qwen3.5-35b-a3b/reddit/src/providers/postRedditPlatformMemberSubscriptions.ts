import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditPlatformSubscriptionCollector } from "../collectors/RedditPlatformSubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformSubscriptionTransformer } from "../transformers/RedditPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformSubscription.ICreate;
}): Promise<IRedditPlatformSubscription> {
  const communityId = props.body.community_id;
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: communityId,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const existingSubscription =
    await MyGlobal.prisma.reddit_platform_subscriptions.findFirst({
      where: {
        user_id: props.member.id,
        community_id: communityId,
        deleted_at: null,
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const banRecord =
    await MyGlobal.prisma.reddit_platform_banned_users.findFirst({
      where: {
        community_id: communityId,
        user_id: props.member.id,
        deleted_at: null,
      },
    });
  if (banRecord !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  const created = await MyGlobal.prisma.reddit_platform_subscriptions.create({
    data: await RedditPlatformSubscriptionCollector.collect({
      body: props.body,
      redditPlatformMembers: {
        id: props.member.id,
      } satisfies IEntity,
    }),
    ...RedditPlatformSubscriptionTransformer.select(),
  });
  return await RedditPlatformSubscriptionTransformer.transform(created);
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
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberSubscriptions(props: {
//   member: MemberPayload;
//   body: IRedditPlatformSubscription.ICreate;
// }): Promise<IRedditPlatformSubscription> {
//   const record = await MyGlobal.prisma.reddit_platform_subscriptions.create({
//     data: await RedditPlatformSubscriptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformSubscriptionTransformer.select(),
//   });
//   return await RedditPlatformSubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------