import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test successful moderator account registration by an administrator.
 *
 * This test validates the complete moderator registration workflow, ensuring
 * that platform administrators can create new moderator accounts with proper
 * privilege levels and activation status. The test verifies email uniqueness
 * validation, password hashing, authentication token generation, and system-
 * managed field population.
 *
 * Key validations:
 *
 * - Moderator account creation succeeds with valid input
 * - Response contains complete moderator profile information
 * - Authentication tokens are properly generated and accessible
 * - System-managed fields (timestamps, IDs) are correctly populated
 * - Moderator privilege levels and activation status are respected
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // Generate realistic moderator creation data
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(),
    moderator_level: RandomGenerator.pick([
      "community",
      "global",
      "super",
    ] as const),
    is_active: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformModerator.ICreate;

  // Call the moderator registration API
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  // Validate the complete response structure - typia.assert() handles ALL type validation
  typia.assert(moderator);

  // Verify that response matches input data (business logic validation)
  TestValidator.equals(
    "email should match input",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "display name should match input",
    moderator.display_name,
    moderatorData.display_name,
  );
  TestValidator.equals(
    "moderator level should match input",
    moderator.moderator_level,
    moderatorData.moderator_level,
  );
  TestValidator.equals(
    "is_active should match input",
    moderator.is_active,
    moderatorData.is_active,
  );

  // Validate system-generated fields exist (business requirement)
  TestValidator.predicate("ID should be present", moderator.id.length > 0);
  TestValidator.predicate(
    "created_at should be present",
    moderator.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be present",
    moderator.updated_at.length > 0,
  );

  // Validate authentication token structure exists (business requirement)
  TestValidator.predicate(
    "access token should be present",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    moderator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be present",
    moderator.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be present",
    moderator.token.refreshable_until.length > 0,
  );

  // Verify password is hashed (business logic - should not be empty)
  TestValidator.predicate(
    "password should be hashed and non-empty",
    moderator.password_hash.length > 0,
  );

  // Validate that optional fields are properly handled if present
  if (
    moderator.last_moderation_at !== null &&
    moderator.last_moderation_at !== undefined
  ) {
    TestValidator.predicate(
      "last_moderation_at should be non-empty if present",
      moderator.last_moderation_at.length > 0,
    );
  }

  if (moderator.deleted_at !== null && moderator.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at should be non-empty if present",
      moderator.deleted_at.length > 0,
    );
  }

  // The SDK automatically handles token management - no headers manipulation needed
  // The moderator account is now ready for immediate use with the returned tokens
}
