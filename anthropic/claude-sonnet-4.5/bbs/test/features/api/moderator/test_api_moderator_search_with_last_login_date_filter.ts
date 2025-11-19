import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test filtering moderators by last login activity using date range parameters.
 *
 * This test validates the moderator search functionality with last_login_at
 * filtering, ensuring that administrators can identify active and inactive
 * moderator accounts based on their login activity patterns.
 *
 * Test workflow:
 *
 * 1. Create multiple moderator accounts with unique credentials
 * 2. Perform login operations for some accounts to establish last_login_at
 *    timestamps
 * 3. Leave at least one account without login (last_login_at remains null)
 * 4. Test filtering with last_login_at_from to find recently active moderators
 * 5. Test filtering with last_login_at_to to identify inactive accounts
 * 6. Test combined date range filtering (both from and to parameters)
 * 7. Verify that null last_login_at values are handled correctly
 * 8. Validate boundary inclusiveness of date range queries
 */
export async function test_api_moderator_search_with_last_login_date_filter(
  connection: api.IConnection,
) {
  // Create first moderator account for testing
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = "password123";
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: moderator1Password,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  // Login with first moderator to establish last_login_at timestamp
  const moderator1Login = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderator1Email,
        password: moderator1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(moderator1Login);

  // Record the timestamp after first login
  const firstLoginTime = new Date().toISOString();

  // Wait a brief moment to create timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = "password456";
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  // Login with second moderator
  const moderator2Login = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderator2Email,
        password: moderator2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(moderator2Login);

  const secondLoginTime = new Date().toISOString();

  // Wait another brief moment
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create third moderator account but DO NOT login (to test null last_login_at)
  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator3Email,
      password: "password789",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator3);

  // Test 1: Search with last_login_at_from to find recently active moderators
  const recentlyActiveSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          last_login_at_from: firstLoginTime,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(recentlyActiveSearch);

  // Validate that returned moderators have last_login_at >= firstLoginTime
  TestValidator.predicate(
    "recently active search should return results",
    recentlyActiveSearch.data.length > 0,
  );

  for (const mod of recentlyActiveSearch.data) {
    if (mod.last_login_at !== null && mod.last_login_at !== undefined) {
      const loginDate = new Date(mod.last_login_at);
      const fromDate = new Date(firstLoginTime);
      TestValidator.predicate(
        "moderator last_login_at should be >= last_login_at_from",
        loginDate >= fromDate,
      );
    }
  }

  // Test 2: Search with last_login_at_to to find moderators who haven't logged in recently
  const futureTimestamp = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const inactiveSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          last_login_at_to: secondLoginTime,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(inactiveSearch);

  // Validate that returned moderators have last_login_at <= secondLoginTime
  for (const mod of inactiveSearch.data) {
    if (mod.last_login_at !== null && mod.last_login_at !== undefined) {
      const loginDate = new Date(mod.last_login_at);
      const toDate = new Date(secondLoginTime);
      TestValidator.predicate(
        "moderator last_login_at should be <= last_login_at_to",
        loginDate <= toDate,
      );
    }
  }

  // Test 3: Combined date range search (both from and to)
  const rangeSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          last_login_at_from: firstLoginTime,
          last_login_at_to: futureTimestamp,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(rangeSearch);

  // Validate date range boundaries
  for (const mod of rangeSearch.data) {
    if (mod.last_login_at !== null && mod.last_login_at !== undefined) {
      const loginDate = new Date(mod.last_login_at);
      const fromDate = new Date(firstLoginTime);
      const toDate = new Date(futureTimestamp);
      TestValidator.predicate(
        "moderator last_login_at should be within range",
        loginDate >= fromDate && loginDate <= toDate,
      );
    }
  }

  // Test 4: Verify handling of moderators with null last_login_at
  const allModerators =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(allModerators);

  // Find moderator3 in results (should have null last_login_at)
  const moderator3InResults = allModerators.data.find(
    (m) => m.email === moderator3Email,
  );
  if (moderator3InResults) {
    TestValidator.equals(
      "moderator who never logged in should have null last_login_at",
      moderator3InResults.last_login_at,
      null,
    );
  }

  // Test 5: Search excluding null last_login_at by using a past timestamp for from
  const pastTimestamp = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const activeOnlySearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          last_login_at_from: pastTimestamp,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(activeOnlySearch);

  // Verify that all returned moderators have non-null last_login_at values
  for (const mod of activeOnlySearch.data) {
    TestValidator.predicate(
      "moderators in date-filtered results should have non-null last_login_at",
      mod.last_login_at !== null && mod.last_login_at !== undefined,
    );
  }
}
