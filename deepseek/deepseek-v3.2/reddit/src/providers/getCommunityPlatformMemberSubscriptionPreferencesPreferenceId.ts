import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionPreferenceTransformer } from "../transformers/CommunityPlatformSubscriptionPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberSubscriptionPreferencesPreferenceId(props: {
  member: MemberPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionPreference> {
  // Query preference with transformer's select to get all needed data including subscription and member
  const preference =
    await MyGlobal.prisma.community_platform_subscription_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        ...CommunityPlatformSubscriptionPreferenceTransformer.select(),
      },
    );
  // Verify member ownership through the subscription relationship
  if (preference.subscription.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformSubscriptionPreferenceTransformer.transform(
    preference,
  );
}
