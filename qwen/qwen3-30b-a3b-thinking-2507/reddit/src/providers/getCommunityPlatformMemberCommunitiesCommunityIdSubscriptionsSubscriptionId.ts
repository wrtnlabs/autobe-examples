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
import { CommunityPlatformCommunitySubscriptionTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  communityId: string;
  subscriptionId: string;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: {
          id: props.subscriptionId,
          community_id: props.communityId,
        },
        ...CommunityPlatformCommunitySubscriptionTransformer.select(),
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  const isOwner = subscription.user.id === props.member.id;
  const isCommunityAdmin = subscription.community.owner.id === props.member.id;
  if (!isOwner && !isCommunityAdmin) {
    throw new HttpException("Access denied", 403);
  }
  return await CommunityPlatformCommunitySubscriptionTransformer.transform(
    subscription,
  );
}
