import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify subscription exists and is not already soft-deleted
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_member_id: true,
        reddit_community_communities_id: true,
        status: true,
      },
    });
  // Step 2: Verify subscription belongs to the authenticated member
  if (subscription.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify community still exists
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: {
      id: subscription.reddit_community_communities_id,
      deleted_at: null,
    },
  });
  // Step 4: Check subscription status - if terminated, return 409 error
  if (subscription.status === "terminated") {
    throw new HttpException("Subscription already terminated", 409);
  }
  // Step 5: Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_community_subscriptions.update({
    where: {
      id: props.subscriptionId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditCommunityMemberSubscriptionsSubscriptionId(props: {
//   member: MemberPayload;
//   subscriptionId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------