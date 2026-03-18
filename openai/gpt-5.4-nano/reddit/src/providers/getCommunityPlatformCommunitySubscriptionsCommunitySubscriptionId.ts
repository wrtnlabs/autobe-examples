import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitySubscriptionsCommunitySubscriptionId(props: {
  communitySubscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const row =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.communitySubscriptionId },
        select: {
          id: true,
          community_id: true,
          member_id: true,
          subscribed_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: row.id,
    community_id: row.community_id,
    member_id: row.member_id,
    subscribed_at: toISOStringSafe(row.subscribed_at),
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
  };
}
