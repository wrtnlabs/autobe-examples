import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommunitySubscriptionTransformer } from "../transformers/RedditLikeCommunityCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberCommunitySubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityCommunitySubscription.IUpdate;
}): Promise<IRedditLikeCommunityCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.subscriptionId, deleted_at: null },
        select: { id: true, member_id: true, community_id: true },
      },
    );
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
    where: { id: subscription.community_id },
  });
  await MyGlobal.prisma.reddit_like_community_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.subscriptionId },
        ...RedditLikeCommunityCommunitySubscriptionTransformer.select(),
      },
    );
  return await RedditLikeCommunityCommunitySubscriptionTransformer.transform(
    updated,
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
// import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberCommunitySubscriptionsSubscriptionId(props: {
//   member: MemberPayload;
//   subscriptionId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityCommunitySubscription.IUpdate;
// }): Promise<IRedditLikeCommunityCommunitySubscription> {
//   await MyGlobal.prisma.reddit_like_community_community_subscriptions.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_community_subscriptions.findUniqueOrThrow({
//     where: { ... },
//     ...RedditLikeCommunityCommunitySubscriptionTransformer.select(),
//   });
//   return await RedditLikeCommunityCommunitySubscriptionTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------