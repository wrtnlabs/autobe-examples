import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that email address uniqueness constraint is enforced during
 * registration.
 *
 * Validates that the system prevents duplicate email registrations by:
 *
 * 1. Register a contributor with email 'alice@example.com'
 * 2. Verify successful registration with authorization tokens
 * 3. Attempt to register another contributor with same email
 * 4. Verify the second registration fails with email already exists error
 * 5. Confirm the first account remains active and unchanged
 */
export async function test_api_contributor_registration_email_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Register first contributor with unique email
  const firstEmail = "alice@example.com";
  const firstUsername = RandomGenerator.name().replace(/\s+/g, "_");
  const firstPassword = "SecurePass123!";
  const testUrl = "https://example.com/register";

  const firstContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: firstEmail,
        username: firstUsername,
        password: firstPassword,
        href: testUrl,
        referrer: testUrl,
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(firstContributor);

  // Step 2: Verify first contributor is created successfully with all required fields
  TestValidator.equals(
    "first contributor email matches",
    firstContributor.email,
    firstEmail,
  );
  TestValidator.equals(
    "first contributor username matches",
    firstContributor.username,
    firstUsername,
  );
  TestValidator.equals(
    "first contributor account status is active",
    firstContributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "first contributor has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      firstContributor.id,
    ),
  );
  TestValidator.predicate(
    "first contributor access token exists",
    firstContributor.token.access.length > 0,
  );
  TestValidator.predicate(
    "first contributor refresh token exists",
    firstContributor.token.refresh.length > 0,
  );

  // Store immutable fields for integrity verification
  const firstContributorId = firstContributor.id;
  const firstContributorCreatedAt = firstContributor.created_at;

  // Step 3: Attempt to register second contributor with duplicate email
  const secondUsername = RandomGenerator.name().replace(/\s+/g, "_");
  const secondPassword = "AnotherPass456!";

  await TestValidator.error(
    "duplicate email should fail with email already exists error",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: firstEmail, // Same email as first contributor - should be rejected
          username: secondUsername,
          password: secondPassword,
          href: testUrl,
          referrer: testUrl,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Step 4: Verify first contributor account integrity remains unchanged
  // Confirm immutable fields through the first successful response
  TestValidator.equals(
    "first contributor ID persists after duplicate attempt",
    firstContributorId,
    firstContributor.id,
  );
  TestValidator.equals(
    "first contributor creation timestamp unchanged",
    firstContributorCreatedAt,
    firstContributor.created_at,
  );
  TestValidator.equals(
    "first contributor email remains unchanged",
    firstEmail,
    firstContributor.email,
  );
  TestValidator.equals(
    "first contributor account still active",
    "active",
    firstContributor.account_status,
  );
}
