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

export async function deleteCommunityPlatformUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the subscription exists and belongs to the current user
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        community_platform_user_id: props.user.id,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "Subscription not found or you do not have permission to delete it",
      404,
    );
  }
  // Perform hard delete - the database handles cascade deletes automatically
  await MyGlobal.prisma.community_platform_community_subscriptions.delete({
    where: { id: props.subscriptionId },
  });
}
