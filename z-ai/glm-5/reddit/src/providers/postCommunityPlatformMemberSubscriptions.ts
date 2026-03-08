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

export async function postCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscription.ICreate;
}): Promise<ICommunityPlatformSubscription> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.body.community_id },
      select: { id: true, deleted_at: true },
    });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Check for existing subscription
  const existing =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: props.body.community_id,
        },
      },
    });
  let subscription;
  if (existing) {
    if (existing.is_active) {
      throw new HttpException("Already subscribed to this community", 409);
    }
    // Reactivate inactive subscription within transaction
    const [updated] = await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_subscriptions.update({
        where: { id: existing.id },
        data: {
          is_active: true,
          updated_at: new Date(),
        },
        ...CommunityPlatformSubscriptionTransformer.select(),
      }),
      MyGlobal.prisma.community_platform_communities.update({
        where: { id: props.body.community_id },
        data: { subscriber_count: { increment: 1 } },
      }),
    ]);
    subscription = updated;
  } else {
    // Create new subscription within transaction
    const [created] = await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_subscriptions.create({
        data: await CommunityPlatformSubscriptionCollector.collect({
          body: props.body,
          communityPlatformMembers: { id: props.member.id },
        }),
        ...CommunityPlatformSubscriptionTransformer.select(),
      }),
      MyGlobal.prisma.community_platform_communities.update({
        where: { id: props.body.community_id },
        data: { subscriber_count: { increment: 1 } },
      }),
    ]);
    subscription = created;
  }
  return await CommunityPlatformSubscriptionTransformer.transform(subscription);
}
