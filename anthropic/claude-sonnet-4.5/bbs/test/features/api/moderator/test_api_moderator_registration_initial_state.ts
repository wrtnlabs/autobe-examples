import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that newly registered moderator accounts have correct initial state
 * values.
 *
 * This test validates the initial field values set during moderator
 * registration. It ensures that moderator accounts are created with proper
 * default states that enforce email verification workflows while allowing
 * immediate authentication capability.
 *
 * Verification Steps:
 *
 * 1. Register a new moderator with random credentials
 * 2. Verify email_verified is false (requiring email verification)
 * 3. Verify email_verified_at is null (no verification completed yet)
 * 4. Verify is_active is true (account immediately active for login)
 * 5. Verify last_login_at reflects the registration session
 * 6. Verify deleted_at is null (account not deleted)
 * 7. Verify created_at and updated_at timestamps are set to current time
 * 8. Verify JWT authentication tokens are returned
 */
export async function test_api_moderator_registration_initial_state(
  connection: api.IConnection,
) {
  // Prepare registration data with random values
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Register new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate response type completeness - this validates ALL type aspects
  typia.assert(moderator);

  // Verify email verification state - must be false initially
  TestValidator.equals(
    "email_verified must be false requiring email verification",
    moderator.email_verified,
    false,
  );

  // Verify email verification timestamp - must be null initially
  TestValidator.equals(
    "email_verified_at must be null before verification",
    moderator.email_verified_at,
    null,
  );

  // Verify account active state - must be true for immediate login capability
  TestValidator.equals(
    "is_active must be true allowing immediate login",
    moderator.is_active,
    true,
  );

  // Verify last_login_at is set (registration creates initial session)
  TestValidator.predicate(
    "last_login_at should be set during registration session",
    moderator.last_login_at !== null && moderator.last_login_at !== undefined,
  );

  // Verify deleted state - must be null for active account
  TestValidator.equals(
    "deleted_at must be null for non-deleted account",
    moderator.deleted_at,
    null,
  );

  // Verify timestamps are recent (within last 5 seconds)
  const now = new Date();
  const createdAt = new Date(moderator.created_at);
  const updatedAt = new Date(moderator.updated_at);
  const fiveSecondsAgo = new Date(now.getTime() - 5000);

  TestValidator.predicate(
    "created_at should be recent timestamp",
    createdAt >= fiveSecondsAgo && createdAt <= now,
  );

  TestValidator.predicate(
    "updated_at should be recent timestamp",
    updatedAt >= fiveSecondsAgo && updatedAt <= now,
  );

  // Verify registered email matches input
  TestValidator.equals(
    "registered email matches input",
    moderator.email,
    registrationData.email,
  );

  // Verify registered username matches input
  TestValidator.equals(
    "registered username matches input",
    moderator.username,
    registrationData.username,
  );
}
