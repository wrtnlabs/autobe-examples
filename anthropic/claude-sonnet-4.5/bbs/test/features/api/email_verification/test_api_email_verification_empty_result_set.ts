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
 * Test that searching email verification records with filters that match no
 * records returns an empty result set with proper pagination metadata.
 *
 * This test validates the system's response when filter criteria exclude all
 * verification records. The scenario ensures that when searching for
 * non-existent member IDs or email addresses, the API returns a well-formed
 * empty response rather than throwing errors.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Search for email verifications using a non-existent member ID
 * 3. Validate the response has empty data array
 * 4. Verify pagination metadata shows zero total records
 * 5. Confirm proper response structure is maintained
 */
export async function test_api_email_verification_empty_result_set(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Search for email verifications using a completely non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  const emptyResult: IPageIDiscussionBoardEmailVerification.ISummary =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          discussion_board_member_id: nonExistentMemberId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult);

  // 3. Validate the response has empty data array
  TestValidator.equals(
    "empty result data array length",
    emptyResult.data.length,
    0,
  );

  // 4. Verify pagination metadata shows zero total records
  TestValidator.equals(
    "pagination total records is zero",
    emptyResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination total pages is zero",
    emptyResult.pagination.pages,
    0,
  );

  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    1,
  );

  TestValidator.equals("pagination limit", emptyResult.pagination.limit, 10);

  // 5. Additional test with non-existent email address
  const emptyEmailResult: IPageIDiscussionBoardEmailVerification.ISummary =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(emptyEmailResult);

  TestValidator.equals(
    "empty email search data array length",
    emptyEmailResult.data.length,
    0,
  );

  TestValidator.equals(
    "empty email search total records",
    emptyEmailResult.pagination.records,
    0,
  );
}
