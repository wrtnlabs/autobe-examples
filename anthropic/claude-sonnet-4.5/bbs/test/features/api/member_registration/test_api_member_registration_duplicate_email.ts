import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration failure when attempting to register with a duplicate
 * email.
 *
 * This test validates that the discussion board platform correctly enforces
 * email uniqueness constraints in the discussion_board_members table. It
 * verifies that the system prevents multiple accounts from being created with
 * the same email address.
 *
 * Test Flow:
 *
 * 1. Successfully register the first member with a specific email address
 * 2. Verify the first registration returns proper authentication tokens
 * 3. Attempt to register a second member with the same email but different
 *    credentials
 * 4. Verify the second registration is rejected with an appropriate error
 *
 * This ensures data integrity and prevents duplicate email accounts in the
 * system.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for first member registration
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberData = {
    email: sharedEmail,
    password: "FirstPassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 2: Register the first member successfully
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Validate first member registration was successful
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    sharedEmail,
  );
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    firstMemberData.username,
  );

  // Step 3: Prepare second member data with same email but different credentials
  const secondMemberData = {
    email: sharedEmail, // Same email as first member
    password: "DifferentPassword456!",
    username: RandomGenerator.name(), // Different username
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 4: Attempt to register second member with duplicate email - should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: secondMemberData,
      });
    },
  );
}
