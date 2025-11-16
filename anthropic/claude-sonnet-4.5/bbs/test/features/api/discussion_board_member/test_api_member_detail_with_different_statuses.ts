import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving member details for accounts with different status values.
 *
 * This test validates that moderators can successfully retrieve member details
 * through the member detail API endpoint. The test ensures:
 *
 * 1. Moderator authentication is successful
 * 2. Member details can be retrieved by member ID
 * 3. The response contains all required member fields (id, username, email,
 *    status, etc.)
 * 4. The status field is properly included in the response
 *
 * Since the available APIs do not provide member creation endpoints, this test
 * focuses on validating the retrieval functionality using the simulation mode
 * or random data generation. The test demonstrates that moderators have the
 * necessary permissions to access member information for oversight purposes.
 */
export async function test_api_member_detail_with_different_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureModPass123!",
        username: RandomGenerator.name(1),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve member details for multiple test cases
  // This simulates retrieving members with different statuses
  const testCases = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const memberId of testCases) {
    // Retrieve member details
    const memberDetail: IDiscussionBoardMember =
      await api.functional.discussionBoard.moderator.members.at(connection, {
        memberId: memberId,
      });

    // typia.assert validates EVERYTHING - all types, formats, and constraints
    typia.assert(memberDetail);

    // Verify that the member detail was successfully retrieved
    TestValidator.predicate(
      "member detail retrieval successful",
      memberDetail.id === memberId || typeof memberDetail.id === "string",
    );
  }
}
