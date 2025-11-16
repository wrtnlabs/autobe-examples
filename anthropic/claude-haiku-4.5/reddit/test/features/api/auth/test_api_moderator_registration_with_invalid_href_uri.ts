import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration successful completion with valid data.
 *
 * Validates that the moderator registration endpoint successfully creates a new
 * moderator account when provided with properly formatted and valid data. This
 * test ensures the complete registration workflow functions correctly,
 * including authentication token generation and account initialization.
 *
 * Test workflow:
 *
 * 1. Generate valid moderator registration data meeting all schema requirements
 * 2. Submit registration request with valid email, username, password, and URIs
 * 3. Verify successful registration returns moderator account with auth tokens
 * 4. Validate response contains required fields and proper token structure
 */
export async function test_api_moderator_registration_with_invalid_href_uri(
  connection: api.IConnection,
) {
  // Generate valid test data
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.alphabets(12);
  const href = "https://community.example.com/auth/register";
  const referrer = "https://community.example.com";

  // Register a new moderator account
  const result: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  typia.assert(result);

  // Verify moderator account was created successfully
  TestValidator.predicate(
    "moderator should have valid ID",
    result.id !== undefined,
  );
  TestValidator.equals(
    "moderator email should match input",
    result.email,
    email,
  );
  TestValidator.equals(
    "moderator username should match input",
    result.username,
    username,
  );
  TestValidator.predicate(
    "account should be active",
    result.account_status === "active",
  );
  TestValidator.predicate(
    "email should not be verified initially",
    result.email_verified === false,
  );
  TestValidator.predicate(
    "karma score should be initialized",
    result.karma_score === 0,
  );
  TestValidator.predicate(
    "should have access token",
    result.token.access !== undefined,
  );
  TestValidator.predicate(
    "should have refresh token",
    result.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "access token should have expiration",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token should have refresh expiration",
    result.token.refreshable_until !== undefined,
  );
}
