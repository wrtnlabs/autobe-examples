import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test filtering moderators by active/inactive status.
 *
 * This test validates the moderator search functionality with the is_active
 * filter parameter. It creates multiple moderator accounts and then performs
 * searches with different is_active filter values to verify that:
 *
 * 1. Is_active=true returns only active moderators
 * 2. Is_active=false returns only inactive moderators
 * 3. Is_active=null returns all moderators regardless of status
 * 4. Pagination metadata is correct for each filtered result set
 *
 * Since the update endpoint does not support changing is_active status based on
 * the DTO schema, this test focuses on validating the search filter
 * functionality with moderators in their default created state (is_active=true
 * by default).
 */
export async function test_api_moderator_search_with_activity_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator to access the search endpoint
  const authModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authModerator);

  // Step 2: Create multiple moderator accounts for testing
  const moderatorCount = 6;
  const createdModerators: IDiscussionBoardModerator.IAuthorized[] =
    await ArrayUtil.asyncRepeat(moderatorCount, async () => {
      const moderator = await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
          username: RandomGenerator.alphaNumeric(10),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
      typia.assert(moderator);
      return moderator;
    });

  // Step 3: Search with is_active=true (should return only active moderators)
  const activeSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          is_active: true,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(activeSearch);

  // Validate that all returned moderators are active
  TestValidator.predicate(
    "all moderators in active search should be active",
    activeSearch.data.every((mod) => mod.is_active === true),
  );

  // Verify that our created moderators are in the active results (they should be active by default)
  const activeModeratorIds = activeSearch.data.map((mod) => mod.id);
  const createdModeratorIds = createdModerators.map((mod) => mod.id);

  for (const createdId of createdModeratorIds) {
    TestValidator.predicate(
      "created moderator should be in active search results",
      activeModeratorIds.includes(createdId),
    );
  }

  // Validate pagination metadata for active search
  TestValidator.predicate(
    "active search should have valid pagination",
    activeSearch.pagination.records >= moderatorCount,
  );

  // Step 4: Search with is_active=false (should return only inactive moderators)
  const inactiveSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          is_active: false,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(inactiveSearch);

  // Validate that all returned moderators are inactive
  TestValidator.predicate(
    "all moderators in inactive search should be inactive",
    inactiveSearch.data.every((mod) => mod.is_active === false),
  );

  // Our created moderators should NOT be in inactive results
  const inactiveModeratorIds = inactiveSearch.data.map((mod) => mod.id);

  for (const createdId of createdModeratorIds) {
    TestValidator.predicate(
      "created moderator should NOT be in inactive search results",
      !inactiveModeratorIds.includes(createdId),
    );
  }

  // Step 5: Search with is_active=null (should return all moderators regardless of status)
  const allSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          is_active: null,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(allSearch);

  // Validate that the total count matches active + inactive
  TestValidator.equals(
    "total moderators should equal active plus inactive",
    allSearch.pagination.records,
    activeSearch.pagination.records + inactiveSearch.pagination.records,
  );

  // All our created moderators should be in the complete results
  const allModeratorIds = allSearch.data.map((mod) => mod.id);

  for (const createdId of createdModeratorIds) {
    TestValidator.predicate(
      "created moderator should be in complete search results",
      allModeratorIds.includes(createdId),
    );
  }

  // Validate pagination metadata consistency
  TestValidator.predicate(
    "all search pagination should be valid",
    allSearch.pagination.records >= moderatorCount &&
      allSearch.pagination.pages >= 1 &&
      allSearch.pagination.current >= 1,
  );
}
