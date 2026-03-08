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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdUnsubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        subscriber_count: true,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Step 2: Verify active subscription exists for this member-community pair
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  // Step 3: Soft delete the subscription record
  await MyGlobal.prisma.reddit_platform_community_subscriptions.update({
    where: {
      id: subscription.id,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 4: Decrement community subscriber count
  await MyGlobal.prisma.reddit_platform_communities.update({
    where: {
      id: props.communityId,
    },
    data: {
      subscriber_count: {
        decrement: 1,
      },
    },
  });
}
