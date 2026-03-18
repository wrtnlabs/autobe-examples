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
import { CommunityPlatformCommunitySubscriptionCollector } from "../collectors/CommunityPlatformCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunitySubscriptionTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true },
    });
    const existing =
      await prisma.community_platform_community_subscriptions.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: props.communityId,
        },
        ...CommunityPlatformCommunitySubscriptionTransformer.select(),
      });
    if (existing !== null && existing.deleted_at === null) {
      throw new HttpException("Already subscribed", 409);
    }
    if (existing !== null) {
      const updated =
        await prisma.community_platform_community_subscriptions.update({
          where: { id: existing.id },
          data: {
            subscription_status: props.body.subscriptionStatus,
            updated_at: new Date(),
            deleted_at: null,
          },
          ...CommunityPlatformCommunitySubscriptionTransformer.select(),
        });
      return await CommunityPlatformCommunitySubscriptionTransformer.transform(
        updated,
      );
    }
    const inserted =
      await prisma.community_platform_community_subscriptions.create({
        data: await CommunityPlatformCommunitySubscriptionCollector.collect({
          body: props.body,
          member: props.member,
          community: {
            id: props.communityId,
          },
        }),
        ...CommunityPlatformCommunitySubscriptionTransformer.select(),
      });
    return await CommunityPlatformCommunitySubscriptionTransformer.transform(
      inserted,
    );
  });
  return created;
}
