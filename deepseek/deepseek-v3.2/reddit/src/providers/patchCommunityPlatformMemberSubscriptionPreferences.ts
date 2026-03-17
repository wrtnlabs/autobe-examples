import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionPreference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionPreferenceAtSummaryTransformer } from "../transformers/CommunityPlatformSubscriptionPreferenceAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSubscriptionPreferences(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscriptionPreference.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionPreference.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause base
  const whereBase = {
    subscription: {
      member: {
        id: props.member.id,
        deleted_at: null,
      },
      deleted_at: null,
      active: true,
    },
  } as Prisma.community_platform_subscription_preferencesWhereInput;
  // Create mutable copy with all conditional properties
  const whereInput = {
    ...whereBase,
    ...(props.body.notify_new_posts !== undefined && {
      notify_new_posts: props.body.notify_new_posts,
    }),
    ...(props.body.notify_new_comments !== undefined && {
      notify_new_comments: props.body.notify_new_comments,
    }),
    ...(props.body.notify_mentions !== undefined && {
      notify_mentions: props.body.notify_mentions,
    }),
    ...(props.body.show_in_home_feed !== undefined && {
      show_in_home_feed: props.body.show_in_home_feed,
    }),
    ...(props.body.highlight_new_content !== undefined && {
      highlight_new_content: props.body.highlight_new_content,
    }),
    ...(props.body.auto_expand_comments !== undefined && {
      auto_expand_comments: props.body.auto_expand_comments,
    }),
    ...(props.body.sort_posts_by !== undefined &&
      (props.body.sort_posts_by === null
        ? { sort_posts_by: null }
        : { sort_posts_by: props.body.sort_posts_by })),
    ...(props.body.sort_comments_by !== undefined &&
      (props.body.sort_comments_by === null
        ? { sort_comments_by: null }
        : { sort_comments_by: props.body.sort_comments_by })),
  } as Prisma.community_platform_subscription_preferencesWhereInput;
  // Handle search - safely add OR property to typed object
  if (props.body.search) {
    const typedWhere =
      whereInput as Prisma.community_platform_subscription_preferencesWhereInput & {
        OR?: any;
      };
    typedWhere.OR = [
      { sort_posts_by: { contains: props.body.search, mode: "insensitive" } },
      {
        sort_comments_by: { contains: props.body.search, mode: "insensitive" },
      },
    ];
  }
  // Handle sort
  const orderByInput = (() => {
    if (props.body.sort) {
      const [field, direction] = props.body.sort.split(",");
      if (field === "created_at" || field === "updated_at") {
        return { [field]: direction as Prisma.SortOrder };
      }
    }
  })();
  // Fetch data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_subscription_preferences.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformSubscriptionPreferenceAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_subscription_preferences.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformSubscriptionPreferenceAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
