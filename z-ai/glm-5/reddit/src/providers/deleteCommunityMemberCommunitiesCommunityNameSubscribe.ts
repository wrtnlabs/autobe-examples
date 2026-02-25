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

export async function deleteCommunityMemberCommunitiesCommunityNameSubscribe(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  // Find the community by name
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check if subscription exists using compound unique constraint
  const subscription = await MyGlobal.prisma.community_subscriptions.findUnique(
    {
      where: {
        community_member_id_community_community_id: {
          community_member_id: props.member.id,
          community_community_id: community.id,
        },
      },
      select: { id: true },
    },
  );
  if (subscription === null) {
    throw new HttpException("You are not subscribed to this community", 400);
  }
  // Delete subscription and decrement subscriber count atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_subscriptions.delete({
      where: { id: subscription.id },
    }),
    MyGlobal.prisma.community_communities.update({
      where: { id: community.id },
      data: {
        subscriber_count: {
          decrement: 1,
        },
      },
    }),
  ]);
}
