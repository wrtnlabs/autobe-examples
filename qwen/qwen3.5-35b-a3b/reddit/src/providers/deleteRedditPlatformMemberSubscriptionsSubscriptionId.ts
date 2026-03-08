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

export async function deleteRedditPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  await MyGlobal.prisma.reddit_platform_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: { deleted_at: new Date() },
  });
}
