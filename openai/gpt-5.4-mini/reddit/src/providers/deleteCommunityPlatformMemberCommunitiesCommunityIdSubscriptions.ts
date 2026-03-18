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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const subscription =
      await prisma.community_platform_community_subscriptions.findUnique({
        where: {
          community_platform_member_id_community_platform_community_id: {
            community_platform_member_id: props.member.id,
            community_platform_community_id: props.communityId,
          },
        },
        select: {
          id: true,
        },
      });
    if (subscription === null) {
      throw new HttpException("Community subscription not found", 404);
    }
    await prisma.community_platform_community_subscriptions.delete({
      where: {
        id: subscription.id,
      },
    });
  });
}
