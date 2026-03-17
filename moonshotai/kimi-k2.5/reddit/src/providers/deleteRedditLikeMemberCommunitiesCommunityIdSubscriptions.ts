import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberCommunitiesCommunityIdSubscriptions(props: {
  member: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the active subscription for this member and community
  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Return 404 if no active subscription exists
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  // Soft-delete the subscription by setting deleted_at
  await MyGlobal.prisma.reddit_like_community_subscriptions.update({
    where: { id: subscription.id },
    data: {
      deleted_at: new Date(),
    },
  });
}
