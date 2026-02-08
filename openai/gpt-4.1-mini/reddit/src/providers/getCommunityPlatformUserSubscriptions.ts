import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
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

export async function getCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    user_id: props.user.id,
    deleted_at: null,
  };
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Removed community relation to avoid property errors
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: whereInput,
    });
  return {
    data: subscriptions.map((subscription) => ({
      id: subscription.id,
      community_id: subscription.community_id,
      user_id: subscription.user_id,
      created_at: toISOStringSafe(subscription.created_at),
      updated_at: toISOStringSafe(subscription.updated_at),
      // deleted_at nullable, use undefined if null
      deleted_at:
        subscription.deleted_at === null
          ? undefined
          : toISOStringSafe(subscription.deleted_at),
      // Removed community property since no related community data is fetched
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
