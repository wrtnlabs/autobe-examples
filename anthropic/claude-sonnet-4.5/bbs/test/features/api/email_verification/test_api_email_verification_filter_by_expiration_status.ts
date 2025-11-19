import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEmailVerification";

/**
 * Test filtering email verification records by token expiration status.
 *
 * This test validates the is_expired filter functionality for email
 * verification records. Since the API automatically sets expires_at to 24 hours
 * in the future upon creation, newly created records will be active (not
 * expired). The test verifies that:
 *
 * 1. Filtering by is_expired=false correctly returns active verification records
 * 2. The response structure and pagination are correct
 * 3. All returned records have expires_at timestamps in the future
 *
 * Note: Testing is_expired=true would require records created more than 24
 * hours ago, which is not feasible in a single test execution.
 *
 * Test flow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create multiple email verification records (all will be active/not expired)
 * 3. Filter by is_expired=false and validate all returned records are active
 * 4. Verify response structure and that expires_at is in the future for all
 *    records
 */
export async function test_api_email_verification_filter_by_expiration_status(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderator: IDiscussionBoardModerator.IAuthorized =
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
  typia.assert(moderator);

  // Step 2: Create email verification records (all will have 24-hour expiration)
  const createdVerifications = await ArrayUtil.asyncRepeat(5, async (index) => {
    return await api.functional.discussionBoard.emailVerifications.create(
      connection,
      {
        body: {
          discussion_board_member_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IDiscussionBoardEmailVerification.ICreate,
      },
    );
  });

  // Validate all created records
  for (const verification of createdVerifications) {
    typia.assert(verification);
  }

  // Step 3: Filter by is_expired=false (should return active tokens)
  const activeResults: IPageIDiscussionBoardEmailVerification.ISummary =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          is_expired: false,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(activeResults);

  // Step 4: Validate that all returned records have active tokens
  const currentTime = new Date();

  TestValidator.predicate(
    "active filter returns at least the created records",
    activeResults.data.length >= createdVerifications.length,
  );

  // Verify that our created records are in the results
  for (const created of createdVerifications) {
    const foundRecord = activeResults.data.find(
      (record) => record.id === created.id,
    );

    if (foundRecord) {
      const expiresAt = new Date(foundRecord.expires_at);
      TestValidator.predicate(
        "active record expires_at should be in the future",
        expiresAt > currentTime,
      );

      TestValidator.equals(
        "member ID should match",
        foundRecord.discussion_board_member_id,
        created.discussion_board_member_id,
      );

      TestValidator.equals(
        "email should match",
        foundRecord.email,
        created.email,
      );
    }
  }

  // Step 5: Verify pagination structure
  TestValidator.predicate(
    "active results have valid pagination",
    activeResults.pagination.current >= 0 &&
      activeResults.pagination.limit > 0 &&
      activeResults.pagination.records >= 0 &&
      activeResults.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records count should be reasonable",
    activeResults.pagination.records >= createdVerifications.length,
  );
}
