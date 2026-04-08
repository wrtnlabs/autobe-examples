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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformSubscriptionAtSummaryTransformer } from "../transformers/RedditPlatformSubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberSubscribedSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformSubscription.ISummary> {
  const subscription =
    await MyGlobal.prisma.reddit_platform_subscriptions.findUniqueOrThrow({
      ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
      where: { id: props.subscriptionId },
    });
  const isOwner = subscription.user.id === props.member.id;
  const isModerator = await MyGlobal.prisma.reddit_platform_community_members
    .findFirst({
      where: {
        user_id: props.member.id,
        community_id: subscription.community.id,
        role: { in: ["owner", "moderator"] as const },
        deleted_at: null,
      },
    })
    .then((r) => r !== null);
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformSubscriptionAtSummaryTransformer.transform(
    subscription,
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
// import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberSubscribedSubscriptionId(props: {
//   member: MemberPayload;
//   subscriptionId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformSubscription.ISummary> {
//   const record = await MyGlobal.prisma.reddit_platform_subscriptions.findFirstOrThrow({
//     ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformSubscriptionAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------