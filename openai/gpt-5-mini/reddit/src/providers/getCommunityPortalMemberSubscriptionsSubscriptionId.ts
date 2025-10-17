import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPortalMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPortalSubscription> {
  const { member, subscriptionId } = props;

  const subscription =
    await MyGlobal.prisma.community_portal_subscriptions.findUnique({
      where: { id: subscriptionId },
    });

  if (!subscription) throw new HttpException("Not Found", 404);

  if (subscription.user_id !== member.id)
    throw new HttpException(
      "Unauthorized: You can only access your own subscriptions",
      403,
    );

  return {
    id: subscription.id as string & tags.Format<"uuid">,
    user_id: subscription.user_id as string & tags.Format<"uuid">,
    community_id: subscription.community_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at: subscription.deleted_at
      ? toISOStringSafe(subscription.deleted_at)
      : null,
  };
}
