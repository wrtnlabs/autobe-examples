import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
import { CommunityPlatformCommunitySubscriptionTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformUserSubscriptionsSearch(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.community_platform_community_subscriptionsWhereInput =
    {
      community_platform_user_id: props.user.id,
      deleted_at: null,
    };
  // Apply status filter
  if (props.body.status === "active") {
    whereInput.unsubscribed_at = null;
  } else if (props.body.status === "inactive") {
    whereInput.unsubscribed_at = { not: null };
  }
  // Apply date range filters - using string comparison since Prisma handles ISO strings
  if (props.body.subscribed_from) {
    whereInput.subscribed_at =
      whereInput.subscribed_at &&
      typeof whereInput.subscribed_at === "object" &&
      whereInput.subscribed_at !== null
        ? { ...whereInput.subscribed_at, gte: props.body.subscribed_from }
        : { gte: props.body.subscribed_from };
  }
  if (props.body.subscribed_to) {
    whereInput.subscribed_at =
      whereInput.subscribed_at &&
      typeof whereInput.subscribed_at === "object" &&
      whereInput.subscribed_at !== null
        ? { ...whereInput.subscribed_at, lte: props.body.subscribed_to }
        : { lte: props.body.subscribed_to };
  }
  if (props.body.unsubscribed_from) {
    whereInput.unsubscribed_at =
      whereInput.unsubscribed_at &&
      whereInput.unsubscribed_at !== null &&
      typeof whereInput.unsubscribed_at === "object" &&
      "not" in whereInput.unsubscribed_at
        ? {
            ...whereInput.unsubscribed_at,
            gte: props.body.unsubscribed_from,
            not: null,
          }
        : { gte: props.body.unsubscribed_from, not: null };
  }
  if (props.body.unsubscribed_to) {
    whereInput.unsubscribed_at =
      whereInput.unsubscribed_at &&
      whereInput.unsubscribed_at !== null &&
      typeof whereInput.unsubscribed_at === "object" &&
      "not" in whereInput.unsubscribed_at
        ? {
            ...whereInput.unsubscribed_at,
            lte: props.body.unsubscribed_to,
            not: null,
          }
        : { lte: props.body.unsubscribed_to, not: null };
  }
  // Apply search filter on community name
  if (props.body.search) {
    whereInput.community = {
      name: { contains: props.body.search, mode: "insensitive" },
    };
  }
  // Query data sequentially (not using Promise.all)
  const data =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { subscribed_at: "desc" },
      ...CommunityPlatformCommunitySubscriptionTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunitySubscriptionTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
