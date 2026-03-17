import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSubscriptionActivityTransformer } from "../transformers/CommunityPlatformSubscriptionActivityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminSubscriptionActivitiesActivityId(props: {
  admin: AdminPayload;
  activityId: string;
}): Promise<ICommunityPlatformSubscriptionActivity> {
  // Validate activityId is a valid UUID format
  if (!typia.is<tags.Format<"uuid">>(props.activityId)) {
    throw new HttpException("Invalid UUID format", 400);
  }
  // Query the subscription activity record with transformer
  const activity =
    await MyGlobal.prisma.community_platform_subscription_activities.findUniqueOrThrow(
      {
        where: {
          id: props.activityId,
          deleted_at: null,
        },
        ...CommunityPlatformSubscriptionActivityTransformer.select(),
      },
    );
  // Transform and return the result
  return await CommunityPlatformSubscriptionActivityTransformer.transform(
    activity,
  );
}
