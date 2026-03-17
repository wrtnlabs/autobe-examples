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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionActivityTransformer } from "../transformers/CommunityPlatformSubscriptionActivityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberSubscriptionActivitiesActivityId(props: {
  member: MemberPayload;
  activityId: string;
}): Promise<ICommunityPlatformSubscriptionActivity> {
  const activity =
    await MyGlobal.prisma.community_platform_subscription_activities.findUniqueOrThrow(
      {
        where: {
          id: props.activityId,
          deleted_at: null,
          member_id: props.member.id,
        },
        ...CommunityPlatformSubscriptionActivityTransformer.select(),
      },
    );
  return await CommunityPlatformSubscriptionActivityTransformer.transform(
    activity,
  );
}
