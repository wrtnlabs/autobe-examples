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

export async function test_api_member_preferences_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberProfile);
  // 2. Get initial preferences (should be created automatically)
  const initialPreferences =
    await api.functional.redditPlatform.member.preferences.update(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(initialPreferences);
  // 3. Partial update: only theme and interface_density
  const partialUpdate: IRedditPlatformFeedPreference.IUpdate = {
    theme: "dark",
    interface_density: "compact",
  };
  const updatedPreferences =
    await api.functional.redditPlatform.member.preferences.update(
      memberConnection,
      {
        body: partialUpdate,
      },
    );
  typia.assert(updatedPreferences);
  // 4. Validate partial update results
  TestValidator.equals("theme updated", updatedPreferences.theme, "dark");
  TestValidator.equals(
    "interface_density updated",
    updatedPreferences.interfaceDensity,
    "compact",
  );
  // 5. Verify other fields remain unchanged
  TestValidator.equals(
    "default_feed_type unchanged",
    updatedPreferences.defaultFeedType,
    initialPreferences.defaultFeedType,
  );
  TestValidator.equals(
    "default_sort_order unchanged",
    updatedPreferences.defaultSortOrder,
    initialPreferences.defaultSortOrder,
  );
  TestValidator.equals(
    "show_nsfw unchanged",
    updatedPreferences.showNsfw,
    initialPreferences.showNsfw,
  );
  TestValidator.equals(
    "content_language unchanged",
    updatedPreferences.contentLanguage,
    initialPreferences.contentLanguage,
  );
  TestValidator.equals(
    "hide_muted_communities unchanged",
    updatedPreferences.hideMutedCommunities,
    initialPreferences.hideMutedCommunities,
  );
  TestValidator.equals(
    "auto_expand_media unchanged",
    updatedPreferences.autoExpandMedia,
    initialPreferences.autoExpandMedia,
  );
  TestValidator.equals(
    "infinite_scroll unchanged",
    updatedPreferences.infiniteScroll,
    initialPreferences.infiniteScroll,
  );
  TestValidator.equals(
    "comment_sort_order unchanged",
    updatedPreferences.commentSortOrder,
    initialPreferences.commentSortOrder,
  );
  TestValidator.equals(
    "show_community_recommendations unchanged",
    updatedPreferences.showCommunityRecommendations,
    initialPreferences.showCommunityRecommendations,
  );
  TestValidator.equals(
    "show_trending_topics unchanged",
    updatedPreferences.showTrendingTopics,
    initialPreferences.showTrendingTopics,
  );
  TestValidator.equals(
    "enable_recommendations unchanged",
    updatedPreferences.enableRecommendations,
    initialPreferences.enableRecommendations,
  );
}
