import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedPreference";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformFeedPreferenceTransformer } from "../transformers/RedditPlatformFeedPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPreferences(props: {
  member: MemberPayload;
  body: IRedditPlatformFeedPreference.IUpdate;
}): Promise<IRedditPlatformFeedPreference> {
  // Check if preferences exist, create if not
  let preference =
    await MyGlobal.prisma.reddit_platform_feed_preferences.findUnique({
      where: { member_id: props.member.id },
    });
  if (!preference) {
    preference = await MyGlobal.prisma.reddit_platform_feed_preferences.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        default_feed_type: props.body.default_feed_type ?? "HOME",
        default_sort_order: props.body.default_sort_order ?? "TOP",
        home_feed_subscribed_only: props.body.home_feed_subscribed_only ?? true,
        content_karma_threshold: props.body.content_karma_threshold ?? null,
        show_nsfw: props.body.show_nsfw ?? false,
        theme: props.body.theme ?? "system",
        interface_density: props.body.interface_density ?? "normal",
        content_language: props.body.content_language ?? null,
        hide_muted_communities: props.body.hide_muted_communities ?? false,
        auto_expand_media: props.body.auto_expand_media ?? true,
        infinite_scroll: props.body.infinite_scroll ?? true,
        comment_sort_order: props.body.comment_sort_order ?? "TOP",
        show_community_recommendations:
          props.body.show_community_recommendations ?? true,
        show_trending_topics: props.body.show_trending_topics ?? true,
        enable_recommendations: props.body.enable_recommendations ?? true,
        updated_at: toISOStringSafe(new Date()),
        created_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    preference = await MyGlobal.prisma.reddit_platform_feed_preferences.update({
      where: { member_id: props.member.id },
      data: {
        default_feed_type:
          props.body.default_feed_type ?? preference.default_feed_type,
        default_sort_order:
          props.body.default_sort_order ?? preference.default_sort_order,
        home_feed_subscribed_only:
          props.body.home_feed_subscribed_only ??
          preference.home_feed_subscribed_only,
        content_karma_threshold:
          props.body.content_karma_threshold ??
          preference.content_karma_threshold,
        show_nsfw: props.body.show_nsfw ?? preference.show_nsfw,
        theme: props.body.theme ?? preference.theme,
        interface_density:
          props.body.interface_density ?? preference.interface_density,
        content_language:
          props.body.content_language ?? preference.content_language,
        hide_muted_communities:
          props.body.hide_muted_communities ??
          preference.hide_muted_communities,
        auto_expand_media:
          props.body.auto_expand_media ?? preference.auto_expand_media,
        infinite_scroll:
          props.body.infinite_scroll ?? preference.infinite_scroll,
        comment_sort_order:
          props.body.comment_sort_order ?? preference.comment_sort_order,
        show_community_recommendations:
          props.body.show_community_recommendations ??
          preference.show_community_recommendations,
        show_trending_topics:
          props.body.show_trending_topics ?? preference.show_trending_topics,
        enable_recommendations:
          props.body.enable_recommendations ??
          preference.enable_recommendations,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  const member = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: preference.member_id },
  });
  return await RedditPlatformFeedPreferenceTransformer.transform({
    ...preference,
    member: {
      id: member?.id ?? preference.member_id,
      username: member?.username ?? "", // Required string - empty fallback
      display_name: member?.display_name ?? null, // Nullable - use null
      avatar_url: member?.avatar_url ?? null, // Nullable - use null
    },
  });
}
