import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test retrieval of password reset records and validation of expiration
 * timestamp logic.
 *
 * This test ensures that:
 *
 * 1. Password reset tokens are created with proper expiration timestamps
 * 2. The expires_at timestamp is set to approximately 1 hour after created_at
 * 3. The used_at field is null for unused tokens
 * 4. All timestamp fields use proper ISO 8601 date-time format
 * 5. Moderators can retrieve and audit password reset records
 *
 * The test validates the documented 1-hour token validity period and confirms
 * that moderators can view accurate token expiration information for security
 * auditing.
 */
export async function test_api_password_reset_retrieval_expiration_validation(
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

  // Step 2: Create a fresh unauthenticated connection for password reset
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Initiate password reset for the member account
  const passwordReset =
    await api.functional.discussionBoard.passwordResets.create(
      unauthConnection,
      {
        body: {
          actor_type: "member",
          email: memberEmail,
        } satisfies IDiscussionBoardPasswordReset.ICreate,
      },
    );
  typia.assert(passwordReset);

  // Step 4: Authenticate as moderator to retrieve password reset records
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

  // Step 5: Retrieve the password reset record as moderator
  const retrievedReset =
    await api.functional.discussionBoard.moderator.passwordResets.at(
      connection,
      {
        resetId: passwordReset.id,
      },
    );
  typia.assert(retrievedReset);

  // Step 6: Validate the retrieved password reset record
  TestValidator.equals(
    "password reset ID matches",
    retrievedReset.id,
    passwordReset.id,
  );
  TestValidator.equals(
    "actor type is member",
    retrievedReset.actor_type,
    "member",
  );
  TestValidator.equals("email matches", retrievedReset.email, memberEmail);

  // Step 7: Validate timestamp formats (ISO 8601 date-time)
  const createdAtDate = new Date(retrievedReset.created_at);
  const expiresAtDate = new Date(retrievedReset.expires_at);

  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    !isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "expires_at is valid ISO 8601 date-time",
    !isNaN(expiresAtDate.getTime()),
  );

  // Step 8: Validate expiration timestamp is approximately 1 hour (3600 seconds) after creation
  const expirationDiffInMs = expiresAtDate.getTime() - createdAtDate.getTime();
  const expirationDiffInSeconds = expirationDiffInMs / 1000;
  const oneHourInSeconds = 3600;

  // Allow 5 seconds tolerance for processing time
  TestValidator.predicate(
    "expires_at is approximately 1 hour after created_at",
    Math.abs(expirationDiffInSeconds - oneHourInSeconds) <= 5,
  );

  // Step 9: Validate used_at is null (token has not been consumed)
  TestValidator.equals(
    "used_at is null for unused token",
    retrievedReset.used_at,
    null,
  );
}
