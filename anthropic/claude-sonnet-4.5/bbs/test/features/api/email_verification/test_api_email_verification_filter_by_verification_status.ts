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
 * Test moderator filtering of email verification records by verification
 * status.
 *
 * This test validates the is_verified filter parameter functionality by
 * creating unverified email verification records and testing both filter
 * values. Since the API only supports creating unverified records (verified_at
 * is null on creation), the test focuses on validating that the filter
 * correctly distinguishes between verified and unverified records.
 *
 * Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple unverified email verification records
 * 3. Test is_verified=false filter to retrieve unverified records
 * 4. Test is_verified=true filter to verify it excludes unverified records
 * 5. Validate filtering accuracy and response structure
 */
export async function test_api_email_verification_filter_by_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecureModerator123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create unverified email verification records
  const createdRecordIds: string[] = [];
  await ArrayUtil.asyncRepeat(5, async () => {
    const record =
      await api.functional.discussionBoard.emailVerifications.create(
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
    typia.assert(record);
    createdRecordIds.push(record.id);
  });

  // Step 3: Filter for unverified records (is_verified=false)
  const unverifiedResults =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          is_verified: false,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(unverifiedResults);

  // Step 4: Validate all returned records are unverified
  TestValidator.predicate(
    "all filtered records should be unverified",
    unverifiedResults.data.every((record) => record.verified_at === null),
  );

  // Step 5: Verify our created records are in the unverified results
  const returnedIds = unverifiedResults.data.map((record) => record.id);
  const foundCreatedRecords = createdRecordIds.filter((id) =>
    returnedIds.includes(id),
  );
  TestValidator.predicate(
    "created unverified records should be in filtered results",
    foundCreatedRecords.length > 0,
  );

  // Step 6: Filter for verified records (is_verified=true)
  const verifiedResults =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          is_verified: true,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedResults);

  // Step 7: Validate all returned records are verified (if any exist)
  TestValidator.predicate(
    "all filtered verified records should have verified_at set",
    verifiedResults.data.every((record) => record.verified_at !== null),
  );

  // Step 8: Verify our created records are NOT in verified results
  const verifiedIds = verifiedResults.data.map((record) => record.id);
  const wronglyIncluded = createdRecordIds.filter((id) =>
    verifiedIds.includes(id),
  );
  TestValidator.predicate(
    "created unverified records should NOT be in verified filter results",
    wronglyIncluded.length === 0,
  );

  // Step 9: Validate pagination structure
  TestValidator.predicate(
    "unverified results pagination is valid",
    unverifiedResults.pagination.current >= 0 &&
      unverifiedResults.pagination.limit > 0 &&
      unverifiedResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "verified results pagination is valid",
    verifiedResults.pagination.current >= 0 &&
      verifiedResults.pagination.limit > 0 &&
      verifiedResults.pagination.records >= 0,
  );
}
