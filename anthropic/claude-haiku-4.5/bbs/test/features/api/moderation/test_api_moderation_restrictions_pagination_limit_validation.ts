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
 * Test pagination limit parameter validation for account restrictions.
 *
 * Validates that the restrictions API correctly enforces limit parameter
 * constraints (minimum 1, maximum 100) and returns proper pagination metadata
 * for different limit values.
 *
 * Process:
 *
 * 1. Authenticate as moderator
 * 2. Test valid limit values (1, 20, 50, 100)
 * 3. Verify pagination metadata matches requested limits
 * 4. Test boundary conditions and invalid limit values
 * 5. Confirm API response structure integrity
 */
export async function test_api_moderation_restrictions_pagination_limit_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test valid limit value = 1
  const resultLimit1: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultLimit1);
  TestValidator.equals(
    "limit 1 pagination limit field",
    resultLimit1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "limit 1 returns valid pagination",
    resultLimit1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit 1 data array is valid",
    Array.isArray(resultLimit1.data),
  );

  // Step 3: Test valid limit value = 20
  const resultLimit20: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultLimit20);
  TestValidator.equals(
    "limit 20 pagination limit field",
    resultLimit20.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "limit 20 data length valid",
    resultLimit20.data.length <= 20,
  );

  // Step 4: Test valid limit value = 50
  const resultLimit50: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultLimit50);
  TestValidator.equals(
    "limit 50 pagination limit field",
    resultLimit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "limit 50 data length valid",
    resultLimit50.data.length <= 50,
  );

  // Step 5: Test valid limit value = 100 (maximum)
  const resultLimit100: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultLimit100);
  TestValidator.equals(
    "limit 100 pagination limit field",
    resultLimit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 data length valid",
    resultLimit100.data.length <= 100,
  );

  // Step 6: Test invalid limit value = 0 (below minimum)
  await TestValidator.error("limit 0 should be rejected", async () => {
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  });

  // Step 7: Test invalid limit value = 101 (above maximum)
  await TestValidator.error("limit 101 should be rejected", async () => {
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 101,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  });

  // Step 8: Verify pagination metadata structure across different limits
  TestValidator.predicate(
    "limit 1 pagination has current field",
    resultLimit1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit 1 pagination has records field",
    resultLimit1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "limit 1 pagination has pages field",
    resultLimit1.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "limit 100 pagination has current field",
    resultLimit100.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit 100 pagination has records field",
    resultLimit100.pagination.records >= 0,
  );
  TestValidator.predicate(
    "limit 100 pagination has pages field",
    resultLimit100.pagination.pages >= 0,
  );

  // Step 9: Verify consistent response structure
  TestValidator.predicate(
    "limit 1 data is array",
    Array.isArray(resultLimit1.data),
  );
  TestValidator.predicate(
    "limit 100 data is array",
    Array.isArray(resultLimit100.data),
  );
}
