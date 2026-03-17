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
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        slug: props.body.community_slug,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active") {
    throw new HttpException(
      "Target community not eligible for subscription",
      400,
    );
  }
  const subscriptionId = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_subscriptions.findUnique({
      where: {
        community_platform_member_id_community_platform_community_id: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: community.id,
        },
      },
      select: {
        id: true,
        active: true,
        deleted_at: true,
      },
    });
    if (existing === null) {
      const created = await prisma.community_platform_subscriptions.create({
        data: await CommunityPlatformSubscriptionCollector.collect({
          body: props.body,
          member: {
            id: props.member.id,
          },
          community: {
            id: community.id,
          },
        }),
        select: {
          id: true,
        },
      });
      return created.id;
    }
    if (existing.active === true && existing.deleted_at === null) {
      throw new HttpException("Already actively subscribed", 409);
    }
    const updated = await prisma.community_platform_subscriptions.update({
      where: {
        id: existing.id,
      },
      data: {
        active: true,
        deleted_at: null,
        updated_at: new Date(),
      },
      select: {
        id: true,
      },
    });
    return updated.id;
  });
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: {
        id: subscriptionId,
      },
      ...CommunityPlatformSubscriptionTransformer.select(),
    });
  return await CommunityPlatformSubscriptionTransformer.transform(subscription);
}
