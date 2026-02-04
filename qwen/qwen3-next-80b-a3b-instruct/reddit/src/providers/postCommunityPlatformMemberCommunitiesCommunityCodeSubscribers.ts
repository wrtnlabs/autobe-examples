import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberCommunitiesCommunityCodeSubscribers(props: {
  member: MemberPayload;
  communityCode: string;
}): Promise<void> {
  // Validate community exists and is active using ID field (not code)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityCode, deleted_at: null },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if member already subscribed using compound unique identifier
  const existingSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: {
          community_platform_member_id_community_platform_community_id: {
            community_platform_member_id: props.member.id,
            community_platform_community_id: community.id,
          },
        },
        select: { id: true },
      },
    );
  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 403);
  }
  // Create subscription record using schema field names
  await MyGlobal.prisma.community_platform_community_subscriptions.create({
    data: {
      id: v4(),
      community_platform_member_id: props.member.id,
      community_platform_community_id: community.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Increment subscriber count atomically
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: community.id },
    data: { subscriber_count: { increment: 1 } },
  });
}
