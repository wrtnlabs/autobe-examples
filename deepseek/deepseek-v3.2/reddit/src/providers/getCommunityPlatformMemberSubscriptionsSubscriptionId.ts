import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionTransformer } from "../transformers/CommunityPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscription> {
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
      select: {
        member_id: true,
        ...CommunityPlatformSubscriptionTransformer.select().select,
      },
    });
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformSubscriptionTransformer.transform(subscription);
}
