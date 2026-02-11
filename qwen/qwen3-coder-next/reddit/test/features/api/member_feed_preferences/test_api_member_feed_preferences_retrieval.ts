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
  // Step 1: Create member account
  const registerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create connection with member token for target endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: member.token.access,
  };
  // Step 3: Retrieve member's feed preferences
  const preferences =
    await api.functional.redditPlatform.member.preferences.my.at(
      memberConnection,
    );
  typia.assert(preferences);
  // Step 4: Validate response structure
  TestValidator.equals("member ID matches", preferences.member.id, member.id);
  TestValidator.predicate(
    "has default feed type",
    ["HOME", "POPULAR", "COMMUNITY"].includes(preferences.defaultFeedType),
  );
  TestValidator.predicate(
    "has valid sort order",
    ["TOP", "NEW", "HOT", "RISING"].includes(preferences.defaultSortOrder),
  );
  TestValidator.equals(
    "home feed subscribed only is boolean",
    typeof preferences.homeFeedSubscribedOnly,
    "boolean",
  );
  TestValidator.predicate(
    "content karma threshold is nullable number",
    preferences.contentKarmaThreshold === null ||
      typeof preferences.contentKarmaThreshold === "number",
  );
  TestValidator.equals(
    "show NSFW is boolean",
    typeof preferences.showNsfw,
    "boolean",
  );
  TestValidator.predicate(
    "theme is valid",
    ["light", "dark", "system"].includes(preferences.theme),
  );
  TestValidator.predicate(
    "interface density is valid",
    ["compact", "normal", "cozy"].includes(preferences.interfaceDensity),
  );
  TestValidator.equals(
    "content language is string or null",
    typeof preferences.contentLanguage === "string" ||
      preferences.contentLanguage === null,
    true,
  );
  TestValidator.equals(
    "hide muted communities is boolean",
    typeof preferences.hideMutedCommunities,
    "boolean",
  );
  TestValidator.equals(
    "auto expand media is boolean",
    typeof preferences.autoExpandMedia,
    "boolean",
  );
  TestValidator.equals(
    "infinite scroll is boolean",
    typeof preferences.infiniteScroll,
    "boolean",
  );
  TestValidator.predicate(
    "comment sort order is valid",
    ["TOP", "NEW", "OLD", "CONVERSATION"].includes(
      preferences.commentSortOrder,
    ),
  );
  TestValidator.equals(
    "show community recommendations is boolean",
    typeof preferences.showCommunityRecommendations,
    "boolean",
  );
  TestValidator.equals(
    "show trending topics is boolean",
    typeof preferences.showTrendingTopics,
    "boolean",
  );
  TestValidator.equals(
    "enable recommendations is boolean",
    typeof preferences.enableRecommendations,
    "boolean",
  );
  // Step 5: Verify timestamps exist and are valid date-time format
  TestValidator.predicate(
    "has valid created at",
    typeof preferences.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(preferences.createdAt),
  );
  TestValidator.predicate(
    "has valid updated at",
    typeof preferences.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(preferences.updatedAt),
  );
}
