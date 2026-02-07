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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.subscriptionId },
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (subscription.deleted_at) {
    throw new HttpException("Subscription has already been soft deleted", 404);
  }
  if (subscription.community_id !== props.communityId) {
    throw new HttpException(
      "Subscription does not belong to this community",
      404,
    );
  }
  if (subscription.user_id !== props.member.id) {
    throw new HttpException("Forbidden: You do not own this subscription", 403);
  }
  await MyGlobal.prisma.community_platform_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
