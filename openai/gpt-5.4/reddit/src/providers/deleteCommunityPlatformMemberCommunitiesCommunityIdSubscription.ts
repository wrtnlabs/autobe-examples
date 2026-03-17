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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdSubscription(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: {
        community_platform_member_id_community_platform_community_id: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: props.communityId,
        },
      },
      select: {
        id: true,
        active: true,
        deleted_at: true,
      },
    });
  if (
    subscription === null ||
    subscription.active === false ||
    subscription.deleted_at !== null
  ) {
    throw new HttpException("Active subscription not found", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.community_platform_subscriptions.update({
    where: {
      id: subscription.id,
    },
    data: {
      active: false,
      updated_at: now,
      deleted_at: now,
    },
  });
}
