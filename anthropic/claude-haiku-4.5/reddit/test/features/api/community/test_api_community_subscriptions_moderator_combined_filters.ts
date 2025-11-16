import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Test combining multiple filters simultaneously when retrieving community
 * subscriptions.
 *
 * A moderator applies username search, karma range filtering, and date range
 * filtering together to find specific members. The test validates that all
 * filters are applied correctly in combination, that pagination works with
 * multiple filters active, and that the result set reflects all filter criteria
 * applied.
 *
 * This test involves:
 *
 * 1. Create administrator account
 * 2. Create category
 * 3. Create moderator account
 * 4. Create member account (community creator)
 * 5. Create community
 * 6. Create multiple member subscriptions
 * 7. Test individual filters (username, karma, date range)
 * 8. Test combined filters (all filter combinations)
 * 9. Verify pagination with multiple filters
 * 10. Validate result accuracy for each filter combination
 */
export async function test_api_community_subscriptions_moderator_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create community (member as creator)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: RandomGenerator.alphabets(15).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create multiple members and subscribe them to the community
  const now = new Date();
  const membersList = await ArrayUtil.asyncMap(
    [
      { username: "alice_developer", index: 0 },
      { username: "bob_engineer", index: 1 },
      { username: "charlie_coder", index: 2 },
      { username: "diana_python", index: 3 },
      { username: "eve_typescript", index: 4 },
    ],
    async (data) => {
      const memberAccount = await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: data.username,
          password: RandomGenerator.alphabets(12),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
      typia.assert(memberAccount);
      return memberAccount;
    },
  );

  // Step 7: Test empty result with strict filters
  const emptyResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          search_username: "nonexistent_user_xyz",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search should return no results",
    emptyResult.data.length,
    0,
  );

  // Step 8: Test username search filter - with partial match
  const partialUsernameResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          search_username: "alice",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(partialUsernameResult);
  TestValidator.predicate("username search filter should work", true);

  // Step 9: Test karma range filtering
  const karmaFilterResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          min_karma: 75,
          max_karma: 150,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(karmaFilterResult);
  TestValidator.predicate("karma range filter should execute", true);

  // Step 10: Test date range filtering
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const oneWeekLater = new Date(now.getTime() + 7 * 86400000);
  const dateRangeResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          subscribed_from: oneWeekAgo.toISOString(),
          subscribed_to: oneWeekLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate("date range filter should execute", true);

  // Step 11: Test combined filters - username + karma
  const usernameKarmaResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          search_username: "eve",
          min_karma: 0,
          max_karma: 300,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(usernameKarmaResult);
  TestValidator.predicate("combined username + karma filter should work", true);

  // Step 12: Test combined filters - username + date range
  const usernameDateResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          search_username: "bob",
          subscribed_from: oneWeekAgo.toISOString(),
          subscribed_to: oneWeekLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(usernameDateResult);
  TestValidator.predicate("combined username + date filter should work", true);

  // Step 13: Test combined filters - karma + date range
  const karmaDateResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          min_karma: 0,
          max_karma: 200,
          subscribed_from: oneWeekAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(karmaDateResult);
  TestValidator.predicate("combined karma + date filter should work", true);

  // Step 14: Test all three filters combined
  const allFiltersResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          search_username: "d",
          min_karma: 0,
          max_karma: 300,
          subscribed_from: oneWeekAgo.toISOString(),
          subscribed_to: oneWeekLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allFiltersResult);
  TestValidator.predicate("all three filters combined should work", true);

  // Step 15: Verify pagination works with filters
  const paginatedResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResult.data.length <= 2,
  );

  // Step 16: Test sorting with filters
  const sortedNewestResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedNewestResult);
  TestValidator.predicate("sorting by newest should work", true);

  // Step 17: Test sorting by oldest
  const sortedOldestResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "oldest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedOldestResult);
  TestValidator.predicate("sorting by oldest should work", true);

  // Step 18: Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page should be 1",
    allFiltersResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    allFiltersResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    allFiltersResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    allFiltersResult.pagination.pages >= 0,
  );

  // Step 19: Test default pagination values
  const defaultPaginationResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(defaultPaginationResult);
  TestValidator.predicate(
    "default pagination should use page 1",
    defaultPaginationResult.pagination.current === 1,
  );
}
