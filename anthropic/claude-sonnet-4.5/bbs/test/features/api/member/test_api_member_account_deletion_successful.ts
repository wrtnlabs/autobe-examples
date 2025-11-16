import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member account deletion workflow.
 *
 * This test validates the member account deletion process:
 *
 * 1. Register a new member account
 * 2. Delete the member's own account while authenticated
 * 3. Verify deletion returns complete member information
 *
 * The test ensures that:
 *
 * - Members can successfully delete their own accounts
 * - Deletion returns proper confirmation data with all member details
 * - The deletion operation completes without errors
 */
export async function test_api_member_account_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name();

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredMember);

  // Verify registration was successful
  TestValidator.equals(
    "registered member email matches",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered member username matches",
    registeredMember.username,
    memberUsername,
  );
  TestValidator.predicate(
    "member has valid UUID ID",
    registeredMember.id.length > 0,
  );
  TestValidator.predicate(
    "member has authentication token",
    registeredMember.token.access.length > 0,
  );

  // Step 2: Delete the member's own account (connection already has auth token from registration)
  const deletedMember =
    await api.functional.discussionBoard.member.members.erase(connection, {
      memberId: registeredMember.id,
    });
  typia.assert(deletedMember);

  // Step 3: Verify deletion response contains correct member information
  TestValidator.equals(
    "deleted member ID matches",
    deletedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "deleted member email matches",
    deletedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "deleted member username matches",
    deletedMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "deleted member status matches",
    deletedMember.status,
    registeredMember.status,
  );
}
