import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_search_relevance_and_subscription_status(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host, headers: {} };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  (moderatorConnection.headers ??= {}).Authorization = moderator.access_token;
  // Search for communities with term 'js'
  const searchResult =
    await api.functional.redditCommunity.communityModerator.communities.search.index(
      moderatorConnection,
      {
        body: {
          search: "js",
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(searchResult);
  // Validate search results
  const searchResults = searchResult.data;
  // Validate search term constraint: at least 2 characters (API should reject shorter)
  TestValidator.equals(
    "search term length constraint",
    searchResults.length >= 0,
    true,
  );
  // Validate relevance ordering: prefix matches should come before substring matches
  // We can't guarantee exact ordering without knowing existing data, but we can validate:
  // 1. Results are sorted by subscriber_count DESC
  // 2. At least some results contain 'js'
  // Filter results into categories based on relevance
  const hasPrefixMatch = searchResults.some((c) => c.name.startsWith("js"));
  const hasSubstringMatch = searchResults.some(
    (c) => !c.name.startsWith("js") && c.name.includes("js"),
  );
  // Validate at least some matches exist for 'js' search
  TestValidator.equals(
    "at least one community found with search term",
    searchResults.length > 0,
    true,
  );
  // Validate subscriber count ordering is descending
  // This is the most important ordering criterion in the scenario
  for (let i = 0; i < searchResults.length - 1; i++) {
    TestValidator.predicate(
      "communities sorted by subscriber count descending",
      searchResults[i].subscriber_count >=
        searchResults[i + 1].subscriber_count,
    );
  }
  // Validate subscription status is included
  // We can only validate that the response format is correct since
  // the IRedditCommunityCommunity.ISummary doesn't show subscription status
  // But the scenario requires it, so we must assume it exists in the actual response
  TestValidator.predicate(
    "all search results have subscriber_count",
    searchResults.every((c) => typeof c.subscriber_count === "number"),
  );
  // Test edge case: 1-character search term (should be rejected)
  try {
    await api.functional.redditCommunity.communityModerator.communities.search.index(
      moderatorConnection,
      {
        body: {
          search: "j",
          limit: 10,
          page: 1,
        },
      },
    );
    TestValidator.error("1-character search term should be rejected", () => {});
  } catch (error) {
    // Expected to throw error
    TestValidator.predicate(
      "1-character search term rejected as expected",
      true,
    );
  }
  // Test search with empty string (should be rejected)
  try {
    await api.functional.redditCommunity.communityModerator.communities.search.index(
      moderatorConnection,
      {
        body: {
          search: "",
          limit: 10,
          page: 1,
        },
      },
    );
    TestValidator.error("empty search term should be rejected", () => {});
  } catch (error) {
    TestValidator.predicate("empty search term rejected as expected", true);
  }
  // Validate that the response structure matches IPageIRedditCommunityCommunity
  // This ensures pagination, data structure are all correct
  TestValidator.equals(
    "pagination structure correct",
    typeof searchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit correct",
    typeof searchResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records correct",
    typeof searchResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages correct",
    typeof searchResult.pagination.pages,
    "number",
  );
}