import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubCommunitySubscriptionTransformer } from "../transformers/CommunityHubCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberCommunitiesCommunityNameSubscriptions(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<ICommunityHubCommunitySubscription> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const existing =
    await MyGlobal.prisma.community_hub_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
      },
    });
  if (existing !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const subscription = await tx.community_hub_community_subscriptions.create({
      data: {
        id: v4(),
        member: { connect: { id: props.member.id } },
        community: { connect: { id: community.id } },
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...CommunityHubCommunitySubscriptionTransformer.select(),
    });
    await tx.community_hub_communities.update({
      where: { id: community.id },
      data: { subscriber_count: { increment: 1 } },
    });
    return subscription;
  });
  return await CommunityHubCommunitySubscriptionTransformer.transform(created);
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
// import { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberCommunitiesCommunityNameSubscriptions(props: {
//   member: MemberPayload;
//   communityName: string;
// }): Promise<ICommunityHubCommunitySubscription> {
//   const record = await MyGlobal.prisma.community_hub_community_subscriptions.findFirstOrThrow({
//     ...CommunityHubCommunitySubscriptionTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubCommunitySubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------