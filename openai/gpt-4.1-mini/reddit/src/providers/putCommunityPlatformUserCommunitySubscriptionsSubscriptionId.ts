import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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

export async function putCommunityPlatformUserCommunitySubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySubscription.IUpdate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.subscriptionId },
      },
    );
  if (subscription === null) {
    throw new HttpException("Community subscription not found", 404);
  }
  if (subscription.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  const dataToUpdate = {
    updated_at: now,
  };
  const updated =
    await MyGlobal.prisma.community_platform_community_subscriptions.update({
      where: { id: props.subscriptionId },
      data: dataToUpdate,
    });
  return {
    id: updated.id,
    community_id: updated.community_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(new Date(updated.created_at)),
    updated_at: toISOStringSafe(new Date(updated.updated_at)),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(new Date(updated.deleted_at)),
  };
}
