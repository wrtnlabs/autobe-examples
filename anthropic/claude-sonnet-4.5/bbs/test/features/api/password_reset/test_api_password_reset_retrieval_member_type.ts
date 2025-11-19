import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test moderator's ability to retrieve detailed information about a member
 * password reset request.
 *
 * This test validates that moderators can access password reset records for
 * administrative review and audit purposes. The scenario follows these steps:
 *
 * 1. Create a member account to generate a password reset request for
 * 2. Initiate a password reset request for the member account to create a reset
 *    record
 * 3. Authenticate as a moderator to access the password reset retrieval endpoint
 * 4. Retrieve the password reset record by its ID
 * 5. Validate the response contains complete password reset information:
 *
 *    - Reset ID matches the created reset record
 *    - Actor_type discriminator is 'member'
 *    - Target email address matches the member's email
 *    - Expiration timestamp is present (1 hour validity)
 *    - Creation timestamp is present
 *    - Used_at field is null (token not yet used)
 */
export async function test_api_password_reset_retrieval_member_type(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Initiate a password reset request for the member account
  const passwordReset =
    await api.functional.discussionBoard.passwordResets.create(connection, {
      body: {
        actor_type: "member",
        email: memberEmail,
      } satisfies IDiscussionBoardPasswordReset.ICreate,
    });
  typia.assert(passwordReset);

  // Step 3: Authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();
  const moderatorUsername = typia.random<string>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Retrieve the password reset record by its ID
  const retrievedReset =
    await api.functional.discussionBoard.moderator.passwordResets.at(
      connection,
      {
        resetId: passwordReset.id,
      },
    );
  typia.assert(retrievedReset);

  // Step 5: Validate the response contains complete password reset information
  TestValidator.equals("reset ID matches", retrievedReset.id, passwordReset.id);
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
  TestValidator.predicate(
    "expiration timestamp exists",
    retrievedReset.expires_at !== null &&
      retrievedReset.expires_at !== undefined,
  );
  TestValidator.predicate(
    "creation timestamp exists",
    retrievedReset.created_at !== null &&
      retrievedReset.created_at !== undefined,
  );
  TestValidator.equals(
    "used_at is null for unused token",
    retrievedReset.used_at,
    null,
  );
}
