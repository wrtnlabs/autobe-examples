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

export async function test_api_member_feed_preferences_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Test: Retrieve member feed preferences
  const preferences =
    await api.functional.redditPlatform.member.preferences.at(memberConnection);
  typia.assert(preferences);
  // Validate: Check all expected fields exist with correct types
  TestValidator.equals("has valid UUID id", typeof preferences.id, "string");
  TestValidator.equals(
    "has valid member summary",
    typeof preferences.member.id,
    "string",
  );
  TestValidator.equals(
    "has valid feed type",
    ["HOME", "POPULAR", "COMMUNITY"].includes(preferences.defaultFeedType),
    true,
  );
  TestValidator.equals(
    "has valid sort order",
    ["TOP", "NEW", "HOT", "RISING"].includes(preferences.defaultSortOrder),
    true,
  );
  TestValidator.equals(
    "has boolean homeFeedSubscribedOnly",
    typeof preferences.homeFeedSubscribedOnly,
    "boolean",
  );
  TestValidator.equals(
    "has boolean showNsfw",
    typeof preferences.showNsfw,
    "boolean",
  );
  TestValidator.equals(
    "has valid theme",
    ["light", "dark", "system"].includes(preferences.theme),
    true,
  );
  TestValidator.equals(
    "has valid interface density",
    ["compact", "normal", "cozy"].includes(preferences.interfaceDensity),
    true,
  );
  TestValidator.equals(
    "has contentLanguage string",
    typeof preferences.contentLanguage,
    "string",
  );
  TestValidator.equals(
    "has boolean hideMutedCommunities",
    typeof preferences.hideMutedCommunities,
    "boolean",
  );
  TestValidator.equals(
    "has boolean autoExpandMedia",
    typeof preferences.autoExpandMedia,
    "boolean",
  );
  TestValidator.equals(
    "has boolean infiniteScroll",
    typeof preferences.infiniteScroll,
    "boolean",
  );
  TestValidator.equals(
    "has valid comment sort order",
    ["TOP", "NEW", "OLD", "CONVERSATION"].includes(
      preferences.commentSortOrder,
    ),
    true,
  );
  TestValidator.equals(
    "has boolean showCommunityRecommendations",
    typeof preferences.showCommunityRecommendations,
    "boolean",
  );
  TestValidator.equals(
    "has boolean showTrendingTopics",
    typeof preferences.showTrendingTopics,
    "boolean",
  );
  TestValidator.equals(
    "has boolean enableRecommendations",
    typeof preferences.enableRecommendations,
    "boolean",
  );
}
