import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
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

export async function postRedditPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IRedditPlatformSubscription> {
  const prisma = MyGlobal.prisma;
  const subscription = await prisma.reddit_platform_subscriptions.create({
    data: {
      id: v4(),
      user_id: props.member.id,
      community_id: props.communityId,
      created_at: new Date(),
    },
  });
  return {
    id: subscription.id,
    user_id: subscription.user_id,
    community_id: subscription.community_id,
    created_at: toISOStringSafe(subscription.created_at),
  };
}
