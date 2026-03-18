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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscription> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const subscription = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing =
      await prisma.community_platform_community_subscriptions.findUnique({
        where: {
          community_platform_member_id_community_platform_community_id: {
            community_platform_member_id: props.member.id,
            community_platform_community_id: props.communityId,
          },
        },
        select: {
          id: true,
          community_platform_member_id: true,
          community_platform_community_id: true,
          subscription_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    if (existing !== null) {
      if (existing.subscription_status !== "active") {
        return await prisma.community_platform_community_subscriptions.update({
          where: { id: existing.id },
          data: {
            subscription_status: "active",
            deleted_at: null,
          },
          select: {
            id: true,
            community_platform_member_id: true,
            community_platform_community_id: true,
            subscription_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
      }
      return existing;
    }
    try {
      return await prisma.community_platform_community_subscriptions.create({
        data: {
          id: v4(),
          community_platform_member_id: props.member.id,
          community_platform_community_id: props.communityId,
          subscription_status: "active",
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: {
          id: true,
          community_platform_member_id: true,
          community_platform_community_id: true,
          subscription_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    } catch {
      return await prisma.community_platform_community_subscriptions.findUniqueOrThrow(
        {
          where: {
            community_platform_member_id_community_platform_community_id: {
              community_platform_member_id: props.member.id,
              community_platform_community_id: props.communityId,
            },
          },
          select: {
            id: true,
            community_platform_member_id: true,
            community_platform_community_id: true,
            subscription_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    }
  });
  return {
    id: subscription.id,
    subscription_status: subscription.subscription_status,
    member: {} as ICommunityPlatformMember.ISummary,
    community: {
      id: props.communityId,
      name: "" as string,
      description: "" as string,
      iconImageUrl: "" as string,
      status: "active" as any,
      owner: {} as ICommunityPlatformMember.ISummary,
      created_at: toISOStringSafe(subscription.created_at),
      updated_at: toISOStringSafe(subscription.updated_at),
      deleted_at:
        subscription.deleted_at === null
          ? null
          : toISOStringSafe(subscription.deleted_at),
    } satisfies ICommunityPlatformCommunity.ISummary,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at:
      subscription.deleted_at === null
        ? null
        : toISOStringSafe(subscription.deleted_at),
  };
}
