import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test ownership verification for account deletion operations.
 *
 * This test validates the critical security requirement that members can only
 * delete their own accounts and cannot remove other members' accounts. This
 * prevents unauthorized account manipulation and enforces proper authorization
 * boundaries.
 *
 * Test workflow:
 *
 * 1. Create first member account and capture credentials
 * 2. Save first member's authorization token
 * 3. Create second member account with different credentials
 * 4. Restore first member's authorization token
 * 5. Attempt to delete the second member's account (should fail)
 * 6. Verify the system rejects unauthorized deletion with proper error
 */
export async function test_api_member_account_deletion_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberUsername = RandomGenerator.name();
  const firstMemberPassword = RandomGenerator.alphaNumeric(12);

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
      username: firstMemberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Save first member's authorization token
  const firstMemberToken = firstMember.token.access;

  // Step 3: Create second member account with different credentials
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberUsername = RandomGenerator.name();
  const secondMemberPassword = RandomGenerator.alphaNumeric(12);

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: secondMemberPassword,
      username: secondMemberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 4: Restore first member's authorization token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = firstMemberToken;

  // Step 5: Attempt to delete the second member's account while authenticated as first member
  // This should fail with an authorization error because firstMember cannot delete secondMember's account
  await TestValidator.error(
    "first member cannot delete second member's account",
    async () => {
      await api.functional.discussionBoard.member.members.erase(connection, {
        memberId: secondMember.id,
      });
    },
  );
}
