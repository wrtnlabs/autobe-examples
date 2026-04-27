import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSubscriptionCollector } from "../collectors/CommunityPlatformSubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionTransformer } from "../transformers/CommunityPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdSubscribers(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.ICreate;
}): Promise<ICommunityPlatformSubscription> {
  // Validate community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check no existing subscription for this member+community pair
  const existing =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Create subscription and increment subscriber count atomically
  const [record] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_subscriptions.create({
      data: await CommunityPlatformSubscriptionCollector.collect({
        body: props.body,
        communityPlatformMembers: { id: props.member.id },
        communityPlatformMemberSessions: { id: props.member.session_id },
        communityPlatformCommunities: { id: props.communityId },
      }),
      ...CommunityPlatformSubscriptionTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_communities.update({
      where: { id: props.communityId },
      data: { subscriber_count: { increment: 1 } },
    }),
  ]);
  return await CommunityPlatformSubscriptionTransformer.transform(record);
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
// import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberCommunitiesCommunityIdSubscribers(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformSubscription.ICreate;
// }): Promise<ICommunityPlatformSubscription> {
//   const record = await MyGlobal.prisma.community_platform_subscriptions.create({
//     data: await CommunityPlatformSubscriptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformSubscriptionTransformer.select(),
//   });
//   return await CommunityPlatformSubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------