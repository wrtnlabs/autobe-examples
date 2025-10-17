import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.IUpdate;
}): Promise<ICommunityPlatformSubscription> {
  // Step 1: Find existing subscription
  const found =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
    });
  if (!found) {
    throw new HttpException("Subscription not found", 404);
  }

  // Step 2: Check ownership
  if (found.member_id !== props.member.id) {
    throw new HttpException(
      "You are not allowed to update this subscription",
      403,
    );
  }

  // Step 3: Update deleted_at
  const updated = await MyGlobal.prisma.community_platform_subscriptions.update(
    {
      where: { id: props.subscriptionId },
      data: {
        deleted_at:
          props.body.deleted_at === undefined
            ? undefined
            : props.body.deleted_at,
      },
    },
  );

  // Step 4: Return with correct type; convert dates to ISO & match branding
  return {
    id: updated.id,
    member_id: updated.member_id,
    community_id: updated.community_id,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : (updated.deleted_at ?? undefined),
  };
}
