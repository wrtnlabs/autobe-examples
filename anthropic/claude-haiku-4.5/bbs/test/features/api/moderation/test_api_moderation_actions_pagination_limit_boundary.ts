import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test pagination limit boundaries and maximum page size for moderation
 * actions.
 *
 * This test validates that the moderation actions listing API properly enforces
 * pagination limit constraints and correctly calculates pagination metadata for
 * different page sizes. The test authenticates as a moderator and requests the
 * moderation actions audit trail with various limit values to verify:
 *
 * 1. Minimum limit boundary (limit=1) returns 1 action per page
 * 2. Typical values (limit=10, 25, 50) work correctly
 * 3. Maximum allowed limit (limit=100) is respected
 * 4. Total pages calculation is accurate for different limits
 * 5. The API respects the limits and returns appropriate page sizes
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Request moderation actions with limit=1, verify 1 item returned
 * 3. Request with limit=10, verify correct pagination info
 * 4. Request with limit=25, verify pagination calculations
 * 5. Request with limit=50, verify pagination calculations
 * 6. Request with limit=100 (maximum), verify maximum is respected
 * 7. Validate that pages calculation is accurate: pages = ceil(records / limit)
 */
export async function test_api_moderation_actions_pagination_limit_boundary(
  connection: api.IConnection,
) {
  // Register and authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Test with limit=1 (minimum meaningful limit)
  const result1 =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "limit=1 should return max 1 item per page",
    result1.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    result1.pagination.limit,
    1,
  );

  // Test with limit=10
  const result10 =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(result10);
  TestValidator.equals(
    "limit=10 should return max 10 items per page",
    result10.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    result10.pagination.limit,
    10,
  );

  // Test with limit=25
  const result25 =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(result25);
  TestValidator.equals(
    "limit=25 should return max 25 items per page",
    result25.data.length <= 25,
    true,
  );
  TestValidator.equals(
    "pagination limit should be 25",
    result25.pagination.limit,
    25,
  );

  // Test with limit=50
  const result50 =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(result50);
  TestValidator.equals(
    "limit=50 should return max 50 items per page",
    result50.data.length <= 50,
    true,
  );
  TestValidator.equals(
    "pagination limit should be 50",
    result50.pagination.limit,
    50,
  );

  // Test with limit=100 (maximum allowed)
  const result100 =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(result100);
  TestValidator.equals(
    "limit=100 should return max 100 items per page",
    result100.data.length <= 100,
    true,
  );
  TestValidator.equals(
    "pagination limit should be 100",
    result100.pagination.limit,
    100,
  );

  // Verify pagination calculations are accurate
  if (result100.pagination.records > 0) {
    const expectedPages = Math.ceil(result100.pagination.records / 100);
    TestValidator.equals(
      "pages calculation should be correct for limit=100",
      result100.pagination.pages,
      expectedPages,
    );

    const expectedPages10 = Math.ceil(result10.pagination.records / 10);
    TestValidator.equals(
      "pages calculation should be correct for limit=10",
      result10.pagination.pages,
      expectedPages10,
    );

    const expectedPages1 = Math.ceil(result1.pagination.records / 1);
    TestValidator.equals(
      "pages calculation should be correct for limit=1",
      result1.pagination.pages,
      expectedPages1,
    );
  }

  // Verify that smaller limits result in more pages for same dataset
  if (result100.pagination.records > 0) {
    TestValidator.predicate(
      "smaller limit should result in more or equal pages",
      result10.pagination.pages >= result100.pagination.pages,
    );
    TestValidator.predicate(
      "limit=1 should result in most pages",
      result1.pagination.pages >= result10.pagination.pages,
    );
  }
}
