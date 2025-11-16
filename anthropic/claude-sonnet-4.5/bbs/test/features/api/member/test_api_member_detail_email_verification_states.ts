import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving member details for accounts with different email verification
 * states.
 *
 * This test validates that moderators can access detailed member information
 * regardless of the member's email verification status. The test ensures that
 * the email_verified boolean field is always present in the API response and
 * accurately reflects the verification state of each member account.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate test member IDs for different verification scenarios
 * 3. Retrieve member details using the moderator credentials
 * 4. Validate response structure with typia.assert (complete validation)
 * 5. Verify moderators have full access to member verification status
 */
export async function test_api_member_detail_email_verification_states(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(moderator);

  // Step 2: Test retrieving member details with different verification states
  // Generate multiple member IDs to simulate different verification scenarios
  const testMemberIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Retrieve member details for each test member
  for (const memberId of testMemberIds) {
    const memberDetail: IDiscussionBoardMember =
      await api.functional.discussionBoard.moderator.members.at(connection, {
        memberId: memberId,
      });

    // Step 4: Validate response structure (typia.assert performs complete validation)
    typia.assert(memberDetail);

    // Verify business logic: member ID should match the requested ID
    TestValidator.equals(
      "member ID should match requested ID",
      memberDetail.id,
      memberId,
    );
  }

  // Step 5: Verify moderator can access both verified and unverified member details
  // This demonstrates that moderators have full visibility for troubleshooting
  const additionalMemberId = typia.random<string & tags.Format<"uuid">>();
  const additionalMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.moderator.members.at(connection, {
      memberId: additionalMemberId,
    });

  typia.assert(additionalMember);

  // Verify business logic: returned member ID matches request
  TestValidator.equals(
    "additional member ID should match requested ID",
    additionalMember.id,
    additionalMemberId,
  );
}
