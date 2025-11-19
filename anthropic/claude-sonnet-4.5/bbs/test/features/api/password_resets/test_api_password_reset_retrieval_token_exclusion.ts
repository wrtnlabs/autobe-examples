import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test that the password reset token field is properly excluded from the API
 * response for security purposes.
 *
 * This test validates a critical security requirement: the sensitive password
 * reset token must never be exposed through API endpoints. The test creates a
 * member account, initiates a password reset to generate a reset record with a
 * secure token, then authenticates as a moderator and retrieves the password
 * reset record by ID.
 *
 * The test verifies that the response contains all expected metadata fields
 * (id, actor_type, email, expires_at, created_at, used_at) but does NOT include
 * the sensitive token field. This ensures that the token, which is a sensitive
 * security credential that authorizes password changes, is never exposed
 * through the API endpoint and is only transmitted via secure email to the
 * account owner.
 *
 * Steps:
 *
 * 1. Create a member account for testing
 * 2. Initiate a password reset for that member to generate a reset record with
 *    token
 * 3. Register and authenticate as a moderator
 * 4. Retrieve the password reset record using the moderator connection
 * 5. Validate all expected fields are present in the response
 * 6. Verify the sensitive token field is NOT present in the response
 */
export async function test_api_password_reset_retrieval_token_exclusion(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: typia.random<string & tags.Format<"password">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<30>
        >(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Initiate password reset for the member
  const passwordReset: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.passwordResets.create(connection, {
      body: {
        actor_type: "member",
        email: memberEmail,
      } satisfies IDiscussionBoardPasswordReset.ICreate,
    });
  typia.assert(passwordReset);

  // Step 3: Register and authenticate as a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "moderator_password_123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Retrieve the password reset record as moderator
  const retrievedReset: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.moderator.passwordResets.at(
      connection,
      {
        resetId: passwordReset.id,
      },
    );
  typia.assert(retrievedReset);

  // Step 5: Validate expected field values match
  TestValidator.equals(
    "retrieved reset ID matches created reset",
    retrievedReset.id,
    passwordReset.id,
  );
  TestValidator.equals(
    "actor_type is member",
    retrievedReset.actor_type,
    "member",
  );
  TestValidator.equals(
    "email matches member email",
    retrievedReset.email,
    memberEmail,
  );

  // Step 6: CRITICAL SECURITY VALIDATION - Verify token field is NOT present in the response
  // The IDiscussionBoardPasswordReset type includes the token field in its definition,
  // but the API implementation should exclude it from responses for security.
  // We check that the token property is not accessible in the retrieved object.
  TestValidator.predicate(
    "token field must NOT be present in retrieved password reset (security requirement)",
    !Object.prototype.hasOwnProperty.call(retrievedReset, "token"),
  );
}
