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
 * Test handling of suspension query filters returning empty result sets.
 *
 * Validates that the moderation suspension API gracefully handles queries that
 * match no records, returning proper pagination metadata with records=0 and
 * pages=0. Tests multiple filter scenarios:
 *
 * 1. Non-existent contributor ID filter
 * 2. Future expiration date filter with expired suspensions
 * 3. Active status filter with no active suspensions
 *
 * Process:
 *
 * 1. Create a moderator account for authentication
 * 2. Query suspensions with non-existent contributor ID
 * 3. Verify empty data array and pagination metadata (records=0, pages=0)
 * 4. Query suspensions with future expiration dates
 * 5. Verify empty result set and proper pagination
 * 6. Query for active suspensions that don't exist
 * 7. Verify empty result set with correct pagination structure
 */
export async function test_api_moderation_suspensions_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query suspensions with non-existent contributor ID
  const nonExistentContributorResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          contributor_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(nonExistentContributorResult);
  TestValidator.equals(
    "non-existent contributor query returns empty data array",
    nonExistentContributorResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent contributor query shows records=0",
    nonExistentContributorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent contributor query shows pages=0",
    nonExistentContributorResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent contributor query returns correct current page",
    nonExistentContributorResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent contributor query returns correct limit",
    nonExistentContributorResult.pagination.limit,
    20,
  );

  // Step 3: Query suspensions with future expiration dates (no expired yet)
  const futureExpirationResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          expires_from: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          expires_to: new Date(
            Date.now() + 60 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(futureExpirationResult);
  TestValidator.equals(
    "future expiration date query returns empty data array",
    futureExpirationResult.data.length,
    0,
  );
  TestValidator.equals(
    "future expiration date query shows records=0",
    futureExpirationResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future expiration date query shows pages=0",
    futureExpirationResult.pagination.pages,
    0,
  );

  // Step 4: Query for suspensions with non-existent moderator ID
  const nonExistentModeratorResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(nonExistentModeratorResult);
  TestValidator.equals(
    "non-existent moderator query returns empty data array",
    nonExistentModeratorResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent moderator query shows records=0",
    nonExistentModeratorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent moderator query shows pages=0",
    nonExistentModeratorResult.pagination.pages,
    0,
  );

  // Step 5: Query for specific suspension type that doesn't exist
  const nonExistentTypeResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          suspension_type: "permanent_ban",
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(nonExistentTypeResult);
  TestValidator.equals(
    "non-existent suspension type query returns empty data array",
    nonExistentTypeResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent suspension type query shows records=0",
    nonExistentTypeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent suspension type query shows pages=0",
    nonExistentTypeResult.pagination.pages,
    0,
  );
}
