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
import { RedditPlatformSubscriptionTransformer } from "../transformers/RedditPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityNameSubscribe(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditPlatformSubscription> {
  // Step 1: Look up community by name (must exist and be active)
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Step 2: Check for duplicate subscription (prevent 409 Conflict)
  const existing =
    await MyGlobal.prisma.reddit_platform_subscriptions.findFirst({
      where: {
        user_id: props.member.id,
        community_id: community.id,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Step 3: Create subscription record
  const created = await MyGlobal.prisma.reddit_platform_subscriptions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user: { connect: { id: props.member.id } },
      community: { connect: { id: community.id } },
      subscribed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...RedditPlatformSubscriptionTransformer.select(),
  });
  // Step 4: Transform and return
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
// export async function postRedditPlatformMemberCommunitiesCommunityNameSubscribe(props: {
//   member: MemberPayload;
//   communityName: string;
// }): Promise<IRedditPlatformSubscription> {
//   const record = await MyGlobal.prisma.reddit_platform_subscriptions.findFirstOrThrow({
//     ...RedditPlatformSubscriptionTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformSubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------