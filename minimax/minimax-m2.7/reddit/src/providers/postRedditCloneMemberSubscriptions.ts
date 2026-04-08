import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditCloneSubscriptionCollector } from "../collectors/RedditCloneSubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneSubscriptionTransformer } from "../transformers/RedditCloneSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCloneSubscription.ICreate;
}): Promise<IRedditCloneSubscription> {
  // Verify community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.body.communityId },
  });
  // Check if user is banned from this community
  const existingBan =
    await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
      where: {
        reddit_clone_community_id: props.body.communityId,
        reddit_clone_member_id: props.member.id,
      },
    });
  if (existingBan) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Check if subscription already exists
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.body.communityId,
      },
    });
  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Create subscription
  const record = await MyGlobal.prisma.reddit_clone_subscriptions.create({
    data: await RedditCloneSubscriptionCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCloneSubscriptionTransformer.select(),
  });
  return await RedditCloneSubscriptionTransformer.transform(record);
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
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberSubscriptions(props: {
//   member: MemberPayload;
//   body: IRedditCloneSubscription.ICreate;
// }): Promise<IRedditCloneSubscription> {
//   const record = await MyGlobal.prisma.reddit_clone_subscriptions.create({
//     data: await RedditCloneSubscriptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCloneSubscriptionTransformer.select(),
//   });
//   return await RedditCloneSubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------