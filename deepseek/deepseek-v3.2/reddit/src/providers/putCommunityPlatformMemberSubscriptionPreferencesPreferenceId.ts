import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionPreferenceTransformer } from "../transformers/CommunityPlatformSubscriptionPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberSubscriptionPreferencesPreferenceId(props: {
  member: MemberPayload;
  preferenceId: string;
  body: ICommunityPlatformSubscriptionPreference.IUpdate;
}): Promise<ICommunityPlatformSubscriptionPreference> {
  // First, get the preference with subscription id
  const preference =
    await MyGlobal.prisma.community_platform_subscription_preferences.findUnique(
      {
        where: { id: props.preferenceId },
        select: {
          id: true,
          community_platform_subscription_id: true,
        },
      },
    );
  if (!preference) {
    throw new HttpException("Subscription preference not found", 404);
  }
  // Then get the subscription to check ownership
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: preference.community_platform_subscription_id },
      select: {
        id: true,
        member_id: true,
        active: true,
      },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  // Verify the authenticated member owns the parent subscription
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build update data with only provided fields
  const updateData: Prisma.community_platform_subscription_preferencesUpdateInput =
    {
      updated_at: new Date(),
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
      ...(props.body.sort_posts_by !== undefined && {
        sort_posts_by: props.body.sort_posts_by,
      }),
      ...(props.body.sort_comments_by !== undefined && {
        sort_comments_by: props.body.sort_comments_by,
      }),
    };
  // Execute the update
  await MyGlobal.prisma.community_platform_subscription_preferences.update({
    where: { id: props.preferenceId },
    data: updateData,
  });
  // Fetch the updated preference with transformer
  const updatedPreference =
    await MyGlobal.prisma.community_platform_subscription_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        ...CommunityPlatformSubscriptionPreferenceTransformer.select(),
      },
    );
  return await CommunityPlatformSubscriptionPreferenceTransformer.transform(
    updatedPreference,
  );
}
