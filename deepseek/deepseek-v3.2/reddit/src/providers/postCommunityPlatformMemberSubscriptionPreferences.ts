import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSubscriptionPreferenceCollector } from "../collectors/CommunityPlatformSubscriptionPreferenceCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionPreferenceTransformer } from "../transformers/CommunityPlatformSubscriptionPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberSubscriptionPreferences(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscriptionPreference.ICreate;
}): Promise<ICommunityPlatformSubscriptionPreference> {
  // Validate subscription exists and belongs to member
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: {
        id: props.body.communityPlatformSubscriptionId,
        member_id: props.member.id,
      },
      select: { id: true, active: true },
    });
  if (!subscription.active) {
    throw new HttpException("Subscription is not active", 400);
  }
  // Check for existing preferences (conflict)
  const existing =
    await MyGlobal.prisma.community_platform_subscription_preferences.findUnique(
      {
        where: {
          community_platform_subscription_id:
            props.body.communityPlatformSubscriptionId,
        },
      },
    );
  if (existing) {
    throw new HttpException("Subscription preferences already exist", 409);
  }
  // Create using Collector
  const created =
    await MyGlobal.prisma.community_platform_subscription_preferences.create({
      data: await CommunityPlatformSubscriptionPreferenceCollector.collect({
        body: props.body,
      }),
      ...CommunityPlatformSubscriptionPreferenceTransformer.select(),
    });
  // Transform to response
  return await CommunityPlatformSubscriptionPreferenceTransformer.transform(
    created,
  );
}
