import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member profile update workflow.
 *
 * This test validates the standard self-service profile modification flow where
 * a member registers a new account and then updates their username to a new
 * unique value.
 *
 * Workflow steps:
 *
 * 1. Register a new member account (establishes authentication context)
 * 2. Update the member's username to a new unique value
 * 3. Verify the update response contains the complete updated profile
 * 4. Validate that the username change persists and updated_at timestamp is
 *    modified
 * 5. Ensure other fields remain unchanged (id, email, status, email_verified,
 *    created_at)
 */
export async function test_api_member_profile_update_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const originalUsername = RandomGenerator.name();
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: typia.random<string>(),
        username: originalUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(registeredMember);

  // Verify initial registration
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    originalUsername,
  );

  // Store original timestamps for comparison
  const originalCreatedAt = registeredMember.created_at;
  const originalUpdatedAt = registeredMember.updated_at;

  // Step 2: Update the member's username
  const newUsername = RandomGenerator.name();

  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: registeredMember.id,
      body: {
        username: newUsername,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Step 3: Validate the update response
  TestValidator.equals(
    "member ID unchanged",
    updatedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "username updated successfully",
    updatedMember.username,
    newUsername,
  );
  TestValidator.equals(
    "email unchanged",
    updatedMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "status unchanged",
    updatedMember.status,
    registeredMember.status,
  );
  TestValidator.equals(
    "email verification status unchanged",
    updatedMember.email_verified,
    registeredMember.email_verified,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedMember.created_at,
    originalCreatedAt,
  );

  // Step 4: Verify updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedMember.updated_at,
    originalUpdatedAt,
  );
}
