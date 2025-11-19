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
 * Test that moderators can filter email verification records by specific member
 * ID.
 *
 * This test validates the discussion_board_member_id filter parameter
 * functionality in the email verification search API. It creates multiple
 * verification records for different member accounts, then searches with a
 * specific member ID filter to verify that only records associated with that
 * member are returned.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate test data: multiple verification records for a target member
 * 3. Generate noise data: verification records for other members
 * 4. Execute search with member ID filter
 * 5. Validate that only the target member's verification records are returned
 */
export async function test_api_email_verification_filter_by_member_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate target member ID and create verification records for this member
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();
  const targetVerifications: IDiscussionBoardEmailVerification[] = [];

  // Create 3 verification records for the target member
  for (let i = 0; i < 3; i++) {
    const verification =
      await api.functional.discussionBoard.emailVerifications.create(
        connection,
        {
          body: {
            discussion_board_member_id: targetMemberId,
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IDiscussionBoardEmailVerification.ICreate,
        },
      );
    typia.assert(verification);
    targetVerifications.push(verification);
  }

  // Step 3: Create verification records for other members (noise data)
  const otherMemberIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const otherMemberId of otherMemberIds) {
    const verification =
      await api.functional.discussionBoard.emailVerifications.create(
        connection,
        {
          body: {
            discussion_board_member_id: otherMemberId,
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IDiscussionBoardEmailVerification.ICreate,
        },
      );
    typia.assert(verification);
  }

  // Step 4: Execute search with member ID filter
  const searchResult: IPageIDiscussionBoardEmailVerification.ISummary =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          discussion_board_member_id: targetMemberId,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 5: Validate pagination structure
  typia.assert<IPage.IPagination>(searchResult.pagination);
  TestValidator.predicate(
    "search result should have data array",
    Array.isArray(searchResult.data),
  );

  // Step 6: Validate that all returned records match the target member ID
  TestValidator.equals(
    "should return exactly 3 verification records for target member",
    searchResult.data.length,
    3,
  );

  for (const record of searchResult.data) {
    TestValidator.equals(
      "all records should have the target member ID",
      record.discussion_board_member_id,
      targetMemberId,
    );
  }

  // Step 7: Verify that returned IDs match the created verification records
  const returnedIds = searchResult.data.map((r) => r.id).sort();
  const expectedIds = targetVerifications.map((v) => v.id).sort();
  TestValidator.equals(
    "returned verification IDs should match created records",
    returnedIds,
    expectedIds,
  );
}
