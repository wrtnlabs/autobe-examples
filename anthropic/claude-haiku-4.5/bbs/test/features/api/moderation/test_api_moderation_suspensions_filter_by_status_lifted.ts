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
 * Test filtering suspensions by lifted status.
 *
 * This test validates the moderator's ability to filter and review suspension
 * records that have been manually lifted (status='lifted'). Lifted suspensions
 * represent early release decisions where restrictions were removed before
 * their natural expiration, often due to appeals or good behavior.
 *
 * Process:
 *
 * 1. Create a moderator account for authentication
 * 2. Query suspensions with status filter set to 'lifted'
 * 3. Validate that only lifted suspensions are returned
 * 4. Verify pagination and result structure
 * 5. Ensure lifted suspensions have proper documentation (lifted_at timestamps)
 */
export async function test_api_moderation_suspensions_filter_by_status_lifted(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username:
          RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve suspensions filtered by status='lifted'
  const liftedSuspensionsPage: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "lifted",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(liftedSuspensionsPage);

  // Step 3: Validate that the response structure is correct
  TestValidator.predicate(
    "response should have pagination information",
    liftedSuspensionsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(liftedSuspensionsPage.data),
  );

  // Step 4: Verify pagination details
  TestValidator.predicate(
    "pagination current page should be positive",
    liftedSuspensionsPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    liftedSuspensionsPage.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    liftedSuspensionsPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    liftedSuspensionsPage.pagination.pages >= 0,
  );

  // Step 5: If there are any lifted suspensions, validate their structure
  if (liftedSuspensionsPage.data.length > 0) {
    const liftedSuspension = liftedSuspensionsPage.data[0];

    // Validate that all returned suspensions have status='lifted'
    TestValidator.equals(
      "suspension status should be lifted",
      liftedSuspension.status,
      "lifted",
    );

    // Validate that lifted suspensions have required fields
    TestValidator.predicate(
      "lifted suspension should have id",
      liftedSuspension.id !== undefined && liftedSuspension.id.length > 0,
    );

    TestValidator.predicate(
      "lifted suspension should have moderator information",
      liftedSuspension.moderator !== undefined,
    );

    TestValidator.predicate(
      "lifted suspension should have reason",
      liftedSuspension.reason !== undefined &&
        liftedSuspension.reason.length > 0,
    );

    TestValidator.predicate(
      "lifted suspension should have suspended_at timestamp",
      liftedSuspension.suspended_at !== undefined,
    );

    TestValidator.predicate(
      "lifted suspension should have lifted_at timestamp",
      liftedSuspension.lifted_at !== undefined,
    );

    // Verify all suspensions in the response have status='lifted'
    await ArrayUtil.asyncForEach(
      liftedSuspensionsPage.data,
      async (suspension) => {
        TestValidator.equals(
          "all suspensions should have lifted status",
          suspension.status,
          "lifted",
        );
      },
    );
  }

  // Step 6: Test pagination with different limits
  const secondPageQuery: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          status: "lifted",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(secondPageQuery);

  TestValidator.equals(
    "second page query should have correct limit",
    secondPageQuery.pagination.limit,
    10,
  );

  TestValidator.equals(
    "second page query should have correct page number",
    secondPageQuery.pagination.current,
    2,
  );
}
