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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionTransformer } from "../transformers/RedditCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: IRedditCommunitySubscription.IUpdate;
}): Promise<IRedditCommunitySubscription> {
  const existingSubscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      select: { id: true, reddit_community_member_id: true },
    });
  if (existingSubscription.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.status !== undefined) {
    if (props.body.status !== "active" && props.body.status !== "terminated") {
      throw new HttpException("Invalid status value", 400);
    }
  }
  await MyGlobal.prisma.reddit_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      ...RedditCommunitySubscriptionTransformer.select(),
    });
  return await RedditCommunitySubscriptionTransformer.transform(updated);
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
// export async function putRedditCommunityMemberSubscriptionsSubscriptionId(props: {
//   member: MemberPayload;
//   subscriptionId: string & tags.Format<"uuid">;
//   body: IRedditCommunitySubscription.IUpdate;
// }): Promise<IRedditCommunitySubscription> {
//   await MyGlobal.prisma.reddit_community_subscriptions.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCommunitySubscriptionTransformer.select(),
//   });
//   return await RedditCommunitySubscriptionTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------