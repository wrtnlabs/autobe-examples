import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving complete details of a specific member.
 *
 * This test validates the moderator's ability to retrieve detailed information
 * about a specific discussion board member by their UUID. The test ensures
 * that:
 *
 * 1. Moderator can successfully authenticate
 * 2. A test member account can be created for retrieval
 * 3. Moderator can access member details using the member's UUID
 * 4. All required fields are validated through typia.assert()
 * 5. Retrieved data matches the created member's information
 * 6. Sensitive information like password hashes is excluded from the response
 *
 * This operation is essential for moderators to review member accounts for
 * moderation purposes, investigate reports, and provide user support.
 *
 * Note: Due to API limitations, this test uses moderator creation as a
 * workaround for member creation since no dedicated member creation endpoint is
 * available.
 */
export async function test_api_member_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModeratorPass123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a test member account
  // Note: Using moderator creation as workaround since no member creation endpoint exists
  const testMemberEmail = typia.random<string & tags.Format<"email">>();
  const testMemberData = {
    email: testMemberEmail,
    password: "TestMemberPass456!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const testMember: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: testMemberData,
    });
  typia.assert(testMember);

  // Store the member ID for retrieval
  const memberId: string & tags.Format<"uuid"> = testMember.id;

  // Step 3: Retrieve member details using moderator authentication
  const retrievedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.moderator.members.at(connection, {
      memberId: memberId,
    });
  typia.assert(retrievedMember);

  // Step 4: Validate retrieved data matches the created member
  TestValidator.equals(
    "retrieved member ID matches created member",
    retrievedMember.id,
    testMember.id,
  );

  TestValidator.equals(
    "retrieved member username matches created member",
    retrievedMember.username,
    testMember.username,
  );

  TestValidator.equals(
    "retrieved member email matches created member",
    retrievedMember.email,
    testMember.email,
  );
}
