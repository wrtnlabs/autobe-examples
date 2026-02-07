import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunitySubscriptionAtSummaryTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscription.ISummary> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check for existing subscription
  const existingSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        user_id: props.member.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Create subscription
  const created =
    await MyGlobal.prisma.community_platform_community_subscriptions.create({
      data: {
        id: v4(),
        community_id: props.communityId,
        user_id: props.member.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Get with relations for transformer
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: created.id },
        ...CommunityPlatformCommunitySubscriptionAtSummaryTransformer.select(),
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  return CommunityPlatformCommunitySubscriptionAtSummaryTransformer.transform(
    subscription,
  );
}
