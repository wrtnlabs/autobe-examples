import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

/**
 * Test pagination of account restrictions by requesting the first page with a
 * specified limit.
 *
 * Validates that the moderation restrictions search API returns correct
 * pagination metadata for the first page of results. This test ensures:
 *
 * - Moderator authentication works properly
 * - The first page (current=1) is returned correctly
 * - Pagination structure contains accurate metadata (limit, total records, pages)
 * - Returned restriction records have valid structure and content
 *
 * The test workflow:
 *
 * 1. Register a moderator account through the join endpoint
 * 2. Request the first page of restrictions with a specified limit (e.g.,
 *    limit=10)
 * 3. Validate pagination metadata indicates first page (current=1)
 * 4. Verify response structure matches IPageIDiscussionBoardAccountRestriction
 * 5. Confirm returned restriction records have proper types and values
 */
export async function test_api_moderation_restrictions_pagination_first_page(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const authenticatedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(authenticatedModerator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    authenticatedModerator.id !== null,
  );

  // Step 2: Request the first page of restrictions with a specific limit
  const pageLimit = 10;
  const restrictionPage =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(restrictionPage);

  // Step 3: Validate pagination metadata for first page
  TestValidator.equals(
    "first page current should be 1",
    restrictionPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    restrictionPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    restrictionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    restrictionPage.pagination.pages >= 0,
  );

  // Step 4: Validate response structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(restrictionPage.data),
  );
  TestValidator.predicate(
    "returned records do not exceed limit",
    restrictionPage.data.length <= pageLimit,
  );

  // Step 5: Validate individual restriction records if any exist
  if (restrictionPage.data.length > 0) {
    const firstRestriction = restrictionPage.data[0];
    typia.assert(firstRestriction);

    TestValidator.predicate(
      "restriction has valid id",
      firstRestriction.id !== null && firstRestriction.id !== undefined,
    );
    TestValidator.predicate(
      "restriction type is valid",
      ["posting_restriction", "temporary_suspension", "permanent_ban"].includes(
        firstRestriction.restriction_type,
      ),
    );
    TestValidator.predicate(
      "restriction has reason",
      firstRestriction.reason.length > 0,
    );
    TestValidator.predicate(
      "restriction has imposed_at timestamp",
      firstRestriction.imposed_at !== null &&
        firstRestriction.imposed_at !== undefined,
    );
    TestValidator.predicate(
      "restriction has valid status",
      ["active", "lifted", "expired"].includes(firstRestriction.status),
    );
    TestValidator.predicate(
      "restriction has contributor",
      firstRestriction.contributor !== null &&
        firstRestriction.contributor !== undefined,
    );
    TestValidator.predicate(
      "restriction has imposed_by_moderator",
      firstRestriction.imposed_by_moderator !== null &&
        firstRestriction.imposed_by_moderator !== undefined,
    );
  }
}
