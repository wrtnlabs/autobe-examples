import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test full-text search functionality for community rules.
 *
 * This test validates the search capabilities of the community rules endpoint
 * by:
 *
 * 1. Creating a moderator and community
 * 2. Adding rules with specific searchable keywords in titles and descriptions
 * 3. Testing various search scenarios (title-only, description-only, both,
 *    non-existent, partial)
 * 4. Verifying case-insensitive matching
 * 5. Validating pagination works correctly with filtered results
 */
export async function test_api_community_rules_search_by_text(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community to hold rules
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create rules with specific searchable keywords
  // Rule 1: Keyword "spam" in title only
  const rule1: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "No spam allowed",
          description:
            "This rule prohibits promotional content and advertisements",
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);

  // Rule 2: Keyword "harassment" in description only
  const rule2: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Be respectful",
          description:
            "Any form of harassment or bullying will result in immediate ban",
          rule_number: 2,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);

  // Rule 3: Keyword "offtopic" in both title and description
  const rule3: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Stay on topic - no offtopic posts",
          description: "All offtopic content will be removed by moderators",
          rule_number: 3,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);

  // Rule 4: Another rule with unique keywords
  const rule4: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Quality content guidelines",
          description: "Ensure your posts meet minimum quality standards",
          rule_number: 4,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule4);

  // Rule 5: Rule with mixed case for case-insensitive testing
  const rule5: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "SPOILER tags required",
          description: "Use spoiler tags when discussing recent events",
          rule_number: 5,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule5);

  // Test 1: Search for keyword in title only ("spam")
  const searchTitleOnly: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "spam",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchTitleOnly);
  TestValidator.predicate(
    "search for 'spam' should find rule1",
    searchTitleOnly.data.length === 1,
  );
  TestValidator.equals(
    "found rule should be rule1",
    searchTitleOnly.data[0].id,
    rule1.id,
  );

  // Test 2: Search for keyword in description only ("harassment")
  const searchDescOnly: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "harassment",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchDescOnly);
  TestValidator.predicate(
    "search for 'harassment' should find rule2",
    searchDescOnly.data.length === 1,
  );
  TestValidator.equals(
    "found rule should be rule2",
    searchDescOnly.data[0].id,
    rule2.id,
  );

  // Test 3: Search for keyword in both title and description ("offtopic")
  const searchBoth: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "offtopic",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchBoth);
  TestValidator.predicate(
    "search for 'offtopic' should find rule3",
    searchBoth.data.length === 1,
  );
  TestValidator.equals(
    "found rule should be rule3",
    searchBoth.data[0].id,
    rule3.id,
  );

  // Test 4: Search for non-existent keyword (should return empty results)
  const searchNonExistent: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "nonexistentkeyword123",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchNonExistent);
  TestValidator.predicate(
    "search for non-existent keyword should return empty results",
    searchNonExistent.data.length === 0,
  );

  // Test 5: Case-insensitive search (searching "SPOILER" should find rule5)
  const searchCaseInsensitive: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "spoiler",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchCaseInsensitive);
  TestValidator.predicate(
    "case-insensitive search for 'spoiler' should find rule5",
    searchCaseInsensitive.data.length === 1,
  );
  TestValidator.equals(
    "found rule should be rule5",
    searchCaseInsensitive.data[0].id,
    rule5.id,
  );

  // Test 6: Partial word matching (searching "quality" should find rule4)
  const searchPartial: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "quality",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchPartial);
  TestValidator.predicate(
    "search for 'quality' should find rule4",
    searchPartial.data.length === 1,
  );
  TestValidator.equals(
    "found rule should be rule4",
    searchPartial.data[0].id,
    rule4.id,
  );

  // Test 7: Pagination with search results (limit results to 2)
  const searchWithPagination: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "content",
        page: 1,
        limit: 2,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "pagination should respect limit parameter",
    searchWithPagination.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    searchWithPagination.pagination.limit === 2,
  );
}
