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

export async function getCommunityHubMemberCommunitiesCommunityNameSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  communityName: string;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubCommunitySubscription> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findFirstOrThrow({
      where: {
        name: { equals: props.communityName, mode: "insensitive" },
        deleted_at: null,
      },
      select: { id: true },
    });
  const subscription =
    await MyGlobal.prisma.community_hub_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.subscriptionId },
        select: {
          community_id: true,
          ...CommunityHubCommunitySubscriptionTransformer.select().select,
        },
      },
    );
  if (subscription.community_id !== community.id) {
    throw new HttpException("Subscription not found in this community", 404);
  }
  return await CommunityHubCommunitySubscriptionTransformer.transform(
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
// import { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubMemberCommunitiesCommunityNameSubscriptionsSubscriptionId(props: {
//   member: MemberPayload;
//   communityName: string;
//   subscriptionId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubCommunitySubscription> {
//   const record = await MyGlobal.prisma.community_hub_community_subscriptions.findFirstOrThrow({
//     ...CommunityHubCommunitySubscriptionTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubCommunitySubscriptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------