import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password reset request for deleted member account.
 *
 * Validates that the system properly handles password reset requests for
 * soft-deleted member accounts without revealing account status for security.
 *
 * Test workflow:
 *
 * 1. Create a new member account through registration
 * 2. Authenticate as the member to obtain authorization token
 * 3. Delete the member account (soft deletion sets deleted_at)
 * 4. Attempt password reset request using deleted member's email
 * 5. Verify system handles request gracefully without exposing deletion status
 */
export async function test_api_password_reset_request_deleted_member_account(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for deletion and password reset testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.100",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Delete the member account to test password reset prevention for deleted accounts
  const deletedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.erase(connection, {
      memberId: createdMember.id,
    });
  typia.assert(deletedMember);

  // Verify the account was actually deleted (deleted_at should be set)
  TestValidator.predicate(
    "member account should be marked as deleted",
    deletedMember.deleted_at !== null && deletedMember.deleted_at !== undefined,
  );

  // Step 3: Attempt password reset for the deleted member account
  const resetResponse: IDiscussionBoardMember.IPasswordResetRequested =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetResponse);

  // Step 4: Validate response - system should handle gracefully without revealing deletion status
  TestValidator.predicate(
    "response should contain success message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  TestValidator.predicate(
    "response should contain valid expiration time",
    resetResponse.expires_in_minutes > 0,
  );
}
