import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator login functionality with valid credentials.
 *
 * This test validates the complete moderator authentication workflow:
 *
 * 1. Create a new moderator account using join operation
 * 2. Attempt to login with the same credentials
 * 3. Verify successful authentication and proper token generation
 * 4. Validate moderator-specific fields in the response
 */
export async function test_api_moderator_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for login testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorDisplayName = RandomGenerator.name();

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: moderatorDisplayName,
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Attempt to login with the created moderator credentials
  const loggedInModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loggedInModerator);

  // Step 3: Validate that login succeeded and returned proper data
  TestValidator.equals(
    "moderator ID should match",
    loggedInModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "email should match",
    loggedInModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "display name should match",
    loggedInModerator.display_name,
    moderatorDisplayName,
  );
  TestValidator.equals(
    "moderator level should match",
    loggedInModerator.moderator_level,
    "community",
  );
  TestValidator.predicate(
    "moderator should be active",
    loggedInModerator.is_active === true,
  );

  // Step 4: Validate authorization token structure
  TestValidator.predicate(
    "token should have access field",
    typeof loggedInModerator.token.access === "string",
  );
  TestValidator.predicate(
    "token should have refresh field",
    typeof loggedInModerator.token.refresh === "string",
  );
  TestValidator.predicate(
    "token should have expired_at field",
    typeof loggedInModerator.token.expired_at === "string",
  );
  TestValidator.predicate(
    "token should have refreshable_until field",
    typeof loggedInModerator.token.refreshable_until === "string",
  );

  // Step 5: Validate token format (ISO date-time)
  TestValidator.predicate(
    "expired_at should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInModerator.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInModerator.token.refreshable_until,
    ),
  );

  // Step 6: Validate additional moderator-specific fields
  TestValidator.predicate(
    "password_hash should be present",
    typeof loggedInModerator.password_hash === "string",
  );
  TestValidator.predicate(
    "created_at should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loggedInModerator.created_at),
  );
  TestValidator.predicate(
    "updated_at should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loggedInModerator.updated_at),
  );
}
