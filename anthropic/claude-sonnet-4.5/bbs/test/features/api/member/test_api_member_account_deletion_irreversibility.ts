import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that account deletion is permanent and irreversible.
 *
 * This test validates the hard deletion behavior of member accounts by:
 *
 * 1. Creating a member account with specific test credentials
 * 2. Deleting the account through the member deletion API
 * 3. Confirming the email address is released by successfully re-registering with
 *    the same email
 *
 * The test ensures that deletion is a true hard delete operation that
 * completely removes the account from the system, making the email address
 * immediately available for new registrations. This proves the deletion is
 * permanent and irreversible - the original account is completely gone and
 * cannot be recovered.
 */
export async function test_api_member_account_deletion_irreversibility(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "TestPassword123!";
  const testUsername = RandomGenerator.name();

  const registrationData = {
    email: testEmail,
    password: testPassword,
    username: testUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(member);

  // Verify member was created successfully
  TestValidator.equals("member email should match", member.email, testEmail);
  TestValidator.equals(
    "member username should match",
    member.username,
    testUsername,
  );

  const memberId = member.id;

  // Step 2: Delete the member account
  const deletedMember =
    await api.functional.discussionBoard.member.members.erase(connection, {
      memberId,
    });
  typia.assert(deletedMember);

  // Verify the deleted member info matches
  TestValidator.equals("deleted member ID matches", deletedMember.id, memberId);
  TestValidator.equals(
    "deleted member email matches",
    deletedMember.email,
    testEmail,
  );

  // Step 3: Re-register with the same email to confirm hard delete
  // If deletion was a soft delete, this registration would fail due to duplicate email
  // If deletion was a hard delete, this should succeed - proving irreversibility
  const reregistrationData = {
    email: testEmail, // Same email as deleted account
    password: "NewPassword456!", // Different password
    username: RandomGenerator.name(), // Different username
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const newMember = await api.functional.auth.member.join(connection, {
    body: reregistrationData,
  });
  typia.assert(newMember);

  // Verify re-registration succeeded with same email - this proves hard delete
  TestValidator.notEquals(
    "new member should have different ID than deleted account",
    newMember.id,
    memberId,
  );
  TestValidator.equals(
    "new member email should be same as deleted account",
    newMember.email,
    testEmail,
  );
  TestValidator.predicate(
    "new member should have valid access token",
    newMember.token.access.length > 0,
  );
}
