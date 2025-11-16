import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommunitySubscriptionsCommunitySubscriptionId(props: {
  user: UserPayload;
  communitySubscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySubscription.IUpdate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.communitySubscriptionId },
        include: {
          user: true,
          community: true,
        },
      },
    );
  if (!subscription) {
    throw new HttpException("Community subscription not found.", 404);
  }
  if (subscription.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to modify this subscription.",
      403,
    );
  }
  const updated =
    await MyGlobal.prisma.community_platform_community_subscriptions.update({
      where: { id: props.communitySubscriptionId },
      data: {
        ...(props.body.deleted_at !== undefined
          ? { deleted_at: props.body.deleted_at }
          : {}),
        updated_at:
          props.body.updated_at !== undefined
            ? props.body.updated_at
            : toISOStringSafe(new Date()),
      },
      include: {
        user: true,
        community: true,
      },
    });
  return {
    id: updated.id,
    user: { id: updated.user.id },
    community: {
      id: updated.community.id,
      name: updated.community.name,
      display_title: updated.community.display_title,
      description: updated.community.description,
      visibility: updated.community.visibility,
      image_url:
        typeof updated.community.image_url === "string"
          ? updated.community.image_url
          : updated.community.image_url === null
            ? null
            : undefined,
      status: updated.community.status,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at === null
        ? null
        : toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
