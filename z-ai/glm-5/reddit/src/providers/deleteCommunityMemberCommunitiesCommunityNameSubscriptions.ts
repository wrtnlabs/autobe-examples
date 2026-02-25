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

export async function deleteCommunityMemberCommunitiesCommunityNameSubscriptions(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  // 1. Find community by name (case-sensitive match due to unique constraint)
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Find existing subscription
  const subscription = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: props.member.id,
      community_community_id: community.id,
    },
  });
  if (subscription === null) {
    throw new HttpException("You are not subscribed to this community", 400);
  }
  // 3. Delete subscription and decrement count atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_subscriptions.delete({
      where: { id: subscription.id },
    }),
    MyGlobal.prisma.community_communities.update({
      where: { id: community.id },
      data: {
        subscriber_count: Math.max(0, community.subscriber_count - 1),
      },
    }),
  ]);
}
