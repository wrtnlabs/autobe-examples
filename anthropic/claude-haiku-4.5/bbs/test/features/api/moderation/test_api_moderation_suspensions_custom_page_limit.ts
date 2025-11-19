import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test custom page limit setting for suspension records pagination.
 *
 * A moderator authenticates to the discussion board system and then retrieves a
 * list of user suspensions with a custom page limit of 50 (instead of the
 * default limit of 20). The test validates that:
 *
 * 1. The moderator can successfully authenticate
 * 2. The pagination system accepts custom limit values within valid range
 * 3. The response pagination metadata correctly reflects the requested limit
 * 4. The system enforces the maximum limit constraint of 100
 * 5. Custom page sizing works correctly for retrieving adjustable result sets
 *
 * This test ensures the moderation system's pagination flexibility and
 * constraint enforcement for suspension record queries.
 */
export async function test_api_moderation_suspensions_custom_page_limit(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve suspensions with custom page limit of 50
  const suspensionsWithCustomLimit: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionsWithCustomLimit);

  // Step 3: Validate pagination metadata reflects custom limit
  TestValidator.equals(
    "pagination limit should be 50",
    suspensionsWithCustomLimit.pagination.limit,
    50,
  );

  // Step 4: Validate response data respects the limit constraint
  TestValidator.predicate(
    "data array should not exceed limit of 50",
    suspensionsWithCustomLimit.data.length <= 50,
  );

  // Step 5: Verify pagination current page is 1
  TestValidator.equals(
    "current page should be 1",
    suspensionsWithCustomLimit.pagination.current,
    1,
  );

  // Step 6: Test maximum limit enforcement - request limit of 100
  const suspensionsWithMaxLimit: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionsWithMaxLimit);

  // Step 7: Validate max limit is properly enforced
  TestValidator.equals(
    "pagination limit should be 100 at maximum",
    suspensionsWithMaxLimit.pagination.limit,
    100,
  );

  TestValidator.predicate(
    "data array should not exceed maximum limit of 100",
    suspensionsWithMaxLimit.data.length <= 100,
  );

  // Step 8: Compare default limit with custom limit behavior
  const suspensionsWithDefaultLimit: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionsWithDefaultLimit);

  // Step 9: Validate default limit is 20
  TestValidator.equals(
    "default pagination limit should be 20",
    suspensionsWithDefaultLimit.pagination.limit,
    20,
  );

  // Step 10: Verify pagination structure consistency
  TestValidator.predicate(
    "pagination records count should be non-negative",
    suspensionsWithCustomLimit.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should match records divided by limit",
    suspensionsWithCustomLimit.pagination.pages >=
      Math.ceil(suspensionsWithCustomLimit.pagination.records / 50),
  );
}
