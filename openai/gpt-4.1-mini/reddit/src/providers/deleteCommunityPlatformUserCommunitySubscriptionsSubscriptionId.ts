import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserCommunitySubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.subscriptionId },
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (subscription.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_community_subscriptions.delete({
    where: { id: props.subscriptionId },
  });
}
