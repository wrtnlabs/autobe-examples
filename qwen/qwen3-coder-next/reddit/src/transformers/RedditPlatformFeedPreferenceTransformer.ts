import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedPreference";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformFeedPreferenceTransformer {
  export type Payload = Prisma.reddit_platform_feed_preferencesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        default_feed_type: true,
        default_sort_order: true,
        home_feed_subscribed_only: true,
        content_karma_threshold: true,
        show_nsfw: true,
        theme: true,
        interface_density: true,
        content_language: true,
        hide_muted_communities: true,
        auto_expand_media: true,
        infinite_scroll: true,
        comment_sort_order: true,
        show_community_recommendations: true,
        show_trending_topics: true,
        enable_recommendations: true,
        updated_at: true,
        created_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        // Omitting reddit_platform_feed_results - no transformer exists
      },
    } satisfies Prisma.reddit_platform_feed_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformFeedPreference> {
    return {
      id: input.id,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      defaultFeedType: input.default_feed_type as
        | "HOME"
        | "POPULAR"
        | "COMMUNITY",
      defaultSortOrder: input.default_sort_order as
        | "TOP"
        | "NEW"
        | "HOT"
        | "RISING",
      homeFeedSubscribedOnly: input.home_feed_subscribed_only,
      contentKarmaThreshold: input.content_karma_threshold ?? undefined,
      showNsfw: input.show_nsfw,
      theme: input.theme as "light" | "dark" | "system",
      interfaceDensity: input.interface_density as
        | "compact"
        | "normal"
        | "cozy",
      contentLanguage: input.content_language ?? null,
      hideMutedCommunities: input.hide_muted_communities,
      autoExpandMedia: input.auto_expand_media,
      infiniteScroll: input.infinite_scroll,
      commentSortOrder: input.comment_sort_order as
        | "TOP"
        | "NEW"
        | "OLD"
        | "CONVERSATION",
      showCommunityRecommendations: input.show_community_recommendations,
      showTrendingTopics: input.show_trending_topics,
      enableRecommendations: input.enable_recommendations,
      updatedAt: input.updated_at.toISOString(),
      createdAt: input.created_at.toISOString(),
    };
  }
}
