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

export async function deleteCommunityPlatformMemberSubscriptionPreferencesPreferenceId(props: {
  member: MemberPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify preference exists and belongs to member's subscription
  const preference =
    await MyGlobal.prisma.community_platform_subscription_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        select: {
          id: true,
          community_platform_subscription_id: true, // Select the foreign key directly
        },
      },
    );
  // Get the subscription to check ownership
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: preference.community_platform_subscription_id },
      select: {
        member_id: true,
      },
    });
  // Check ownership
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete preference (cascade onDelete ensures no orphan records)
  await MyGlobal.prisma.community_platform_subscription_preferences.delete({
    where: { id: props.preferenceId },
  });
}
