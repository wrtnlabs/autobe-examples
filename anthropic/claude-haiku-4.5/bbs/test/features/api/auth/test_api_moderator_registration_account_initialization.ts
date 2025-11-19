import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator account initialization with correct default values.
 *
 * Validates that when a moderator registers through the /auth/moderator/join
 * endpoint, the account is properly initialized with:
 *
 * - Account_status as 'active'
 * - Moderation_tier as 'full'
 * - Email_verified as false (requires email verification)
 * - Created_at timestamp set to current time
 * - Last_login_at as null (no login yet)
 * - Deleted_at as null (not deleted)
 *
 * This ensures proper account lifecycle management and permission
 * initialization.
 *
 * Steps:
 *
 * 1. Generate unique moderator credentials
 * 2. Register a new moderator account via the join endpoint
 * 3. Verify all default values are correctly initialized
 * 4. Validate timestamp precision and nullability
 */
export async function test_api_moderator_registration_account_initialization(
  connection: api.IConnection,
) {
  // Step 1: Generate unique moderator credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Test@Password123"; // Meets complexity requirements: 8+ chars, uppercase, lowercase, number, special char
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  // Step 2: Register a new moderator account
  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password,
        username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Validate the response contains proper structure
  typia.assert(registeredModerator);

  // Step 3: Verify account_status is 'active'
  TestValidator.equals(
    "account_status should be initialized as active",
    registeredModerator.account_status,
    "active",
  );

  // Step 4: Verify moderation_tier is 'full'
  TestValidator.equals(
    "moderation_tier should be initialized as full",
    registeredModerator.moderation_tier,
    "full",
  );

  // Step 5: Verify email_verified is false
  TestValidator.equals(
    "email_verified should be false until verified",
    registeredModerator.email_verified,
    false,
  );

  // Step 6: Verify created_at is set to a valid ISO 8601 datetime
  TestValidator.predicate(
    "created_at should be a valid ISO 8601 datetime",
    () => {
      const createdDate = new Date(registeredModerator.created_at);
      return (
        !isNaN(createdDate.getTime()) &&
        registeredModerator.created_at.match(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ) !== null
      );
    },
  );

  // Step 7: Verify created_at is recent (within last minute)
  TestValidator.predicate("created_at should be set to current time", () => {
    const createdDate = new Date(registeredModerator.created_at);
    const now = new Date();
    const timeDiffMs = now.getTime() - createdDate.getTime();
    return timeDiffMs >= 0 && timeDiffMs < 60000; // Within 60 seconds
  });

  // Step 8: Verify last_login_at is null (no login yet)
  TestValidator.equals(
    "last_login_at should be null before first login",
    registeredModerator.last_login_at,
    null,
  );

  // Step 9: Verify deleted_at is null (account not deleted)
  TestValidator.equals(
    "deleted_at should be null for active account",
    registeredModerator.deleted_at,
    null,
  );

  // Step 10: Verify email matches input
  TestValidator.equals(
    "registered email should match input",
    registeredModerator.email,
    email,
  );

  // Step 11: Verify username matches input
  TestValidator.equals(
    "registered username should match input",
    registeredModerator.username,
    username,
  );

  // Step 12: Verify token is provided for authenticated access
  TestValidator.predicate(
    "authorization token should be present",
    () =>
      registeredModerator.token !== undefined &&
      registeredModerator.token.access !== undefined &&
      registeredModerator.token.refresh !== undefined,
  );
}
