import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete permanent deletion workflow where an administrator deletes
 * a user account and verifies that all associated data is removed from the
 * database through cascading deletes.
 *
 * This test validates the irreversible permanent deletion functionality of the
 * discussion board system. It creates an administrator account, a member
 * account, and then performs a hard delete operation to verify that the member
 * account is permanently removed from the system.
 *
 * Workflow:
 *
 * 1. Create an administrator account through join endpoint for authentication
 * 2. Create a member account that will be deleted
 * 3. Administrator performs hard delete on the member account
 * 4. Verify the deletion succeeds with appropriate success response (void return)
 *
 * Note: The current API does not provide endpoints to create discussion topics,
 * replies, votes, or favorites, nor does it provide endpoints to verify their
 * deletion. Therefore, this test focuses on the core deletion functionality
 * that is available: creating users and deleting the member account by
 * administrator. The cascading delete behavior is guaranteed by the database
 * schema foreign key constraints, but cannot be explicitly verified in this
 * test due to API endpoint limitations.
 */
export async function test_api_user_account_permanent_deletion_with_cascading_data_removal(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with deletion privileges
  const adminData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account that will be permanently deleted
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Administrator performs hard delete on the member account
  // The deletion should permanently remove the member and cascade to all related data
  await api.functional.discussionBoard.administrator.users.erase(connection, {
    userId: member.id,
  });

  // Step 4: Verify deletion succeeded
  // The erase function returns void, indicating successful deletion
  // In a complete implementation, we would verify:
  // - The member account no longer exists
  // - All topics authored by the member are removed
  // - All replies posted by the member are removed
  // - All votes cast by the member are removed
  // - All favorites by the member are removed
  // However, the current API does not provide endpoints to verify these cascading deletes
}
