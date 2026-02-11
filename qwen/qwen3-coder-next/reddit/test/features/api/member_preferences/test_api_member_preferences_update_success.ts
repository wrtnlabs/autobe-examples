import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedPreference";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_preferences_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Update feed preferences using the authenticated connection
  const updated = await api.functional.redditPlatform.member.preferences.update(
    memberConnection,
    {
      body: {
        default_feed_type: "HOME",
        default_sort_order: "TOP",
        theme: "dark",
        interface_density: "normal",
        home_feed_subscribed_only: true,
        show_nsfw: false,
        content_language: "en",
        hide_muted_communities: true,
        auto_expand_media: true,
        infinite_scroll: true,
        comment_sort_order: "TOP",
        show_community_recommendations: true,
        show_trending_topics: true,
        enable_recommendations: true,
      } satisfies IRedditPlatformFeedPreference.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate updated preferences
  TestValidator.equals("default_feed_type", updated.defaultFeedType, "HOME");
  TestValidator.equals("default_sort_order", updated.defaultSortOrder, "TOP");
  TestValidator.equals("theme", updated.theme, "dark");
  TestValidator.equals("interface_density", updated.interfaceDensity, "normal");
  TestValidator.equals(
    "homeFeedSubscribedOnly",
    updated.homeFeedSubscribedOnly,
    true,
  );
  TestValidator.equals("showNsfw", updated.showNsfw, false);
  TestValidator.equals("contentLanguage", updated.contentLanguage, "en");
  TestValidator.equals(
    "hideMutedCommunities",
    updated.hideMutedCommunities,
    true,
  );
  TestValidator.equals("autoExpandMedia", updated.autoExpandMedia, true);
  TestValidator.equals("infiniteScroll", updated.infiniteScroll, true);
  TestValidator.equals("commentSortOrder", updated.commentSortOrder, "TOP");
  TestValidator.equals(
    "showCommunityRecommendations",
    updated.showCommunityRecommendations,
    true,
  );
  TestValidator.equals("showTrendingTopics", updated.showTrendingTopics, true);
  TestValidator.equals(
    "enableRecommendations",
    updated.enableRecommendations,
    true,
  );
}
