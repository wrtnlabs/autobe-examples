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

export async function getRedditCommunityMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunitySubscription> {
  const record =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirstOrThrow({
      ...RedditCommunitySubscriptionTransformer.select(),
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
    });
  const isOwner = record.member.id === props.member.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
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
// export async function getRedditCommunityMemberSubscriptionsSubscriptionId(props: {
//   member: MemberPayload;
//   subscriptionId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunitySubscription> {
//   const record = await MyGlobal.prisma.reddit_community_subscriptions.findFirstOrThrow({
//     ...RedditCommunitySubscriptionTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunitySubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------