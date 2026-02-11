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

export async function test_api_member_feed_preferences_default_values(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection and log in as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Get feed preferences - should return default values when no preference exists
  const preferences: IRedditPlatformFeedPreference =
    await api.functional.redditPlatform.member.preferences.at(memberConnection);
  typia.assert(preferences);
  // Validate default values structure
  TestValidator.equals(
    "defaultFeedType is HOME",
    preferences.defaultFeedType,
    "HOME",
  );
  TestValidator.equals(
    "defaultSortOrder is TOP",
    preferences.defaultSortOrder,
    "TOP",
  );
  TestValidator.equals(
    "homeFeedSubscribedOnly is false",
    preferences.homeFeedSubscribedOnly,
    false,
  );
  TestValidator.equals("showNsfw is false", preferences.showNsfw, false);
  TestValidator.equals("theme is light", preferences.theme, "light");
  TestValidator.equals(
    "interfaceDensity is normal",
    preferences.interfaceDensity,
    "normal",
  );
  TestValidator.equals(
    "contentLanguage is empty string",
    preferences.contentLanguage,
    "",
  );
  TestValidator.equals(
    "hideMutedCommunities is false",
    preferences.hideMutedCommunities,
    false,
  );
  TestValidator.equals(
    "autoExpandMedia is false",
    preferences.autoExpandMedia,
    false,
  );
  TestValidator.equals(
    "infiniteScroll is false",
    preferences.infiniteScroll,
    false,
  );
  TestValidator.equals(
    "commentSortOrder is TOP",
    preferences.commentSortOrder,
    "TOP",
  );
  TestValidator.equals(
    "showCommunityRecommendations is true",
    preferences.showCommunityRecommendations,
    true,
  );
  TestValidator.equals(
    "showTrendingTopics is true",
    preferences.showTrendingTopics,
    true,
  );
  TestValidator.equals(
    "enableRecommendations is true",
    preferences.enableRecommendations,
    true,
  );
}
