import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that email matching during login is case-insensitive
 *
 * This test verifies that contributor authentication works correctly regardless
 * of the case used in the email address. A contributor registers with email
 * 'Alice@Example.COM' and then attempts to login using various case
 * combinations of the same email. All variations should successfully
 * authenticate, confirming that the system performs case-insensitive email
 * matching as expected for email-based authentication systems.
 *
 * Test flow:
 *
 * 1. Register a contributor with email 'Alice@Example.COM'
 * 2. Attempt login with lowercase email 'alice@example.com'
 * 3. Attempt login with uppercase email 'ALICE@EXAMPLE.COM'
 * 4. Attempt login with mixed case email 'AlIcE@eXaMpLe.CoM'
 * 5. Verify each login returns valid authorization tokens
 */
export async function test_api_contributor_login_case_insensitive_email(
  connection: api.IConnection,
) {
  // Setup: Create test data
  const testEmail = "Alice@Example.COM";
  const testPassword = "SecurePassword123!";
  const testUsername = RandomGenerator.name()
    .replace(/\s+/g, "_")
    .toLowerCase();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register contributor with the original email case
  const registered: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: testEmail,
        username: testUsername,
        password: testPassword,
        href: testHref,
        referrer: testReferrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registered);
  TestValidator.equals(
    "registered email should match input",
    registered.email.toLowerCase(),
    testEmail.toLowerCase(),
  );

  // Test case variations
  const emailVariations = [
    "alice@example.com", // all lowercase
    "ALICE@EXAMPLE.COM", // all uppercase
    "AlIcE@eXaMpLe.CoM", // mixed case
  ];

  for (const emailVariation of emailVariations) {
    const loginResult: IDiscussionBoardContributor.IAuthorized =
      await api.functional.auth.contributor.login(connection, {
        body: {
          email: emailVariation,
          password: testPassword,
          href: testHref,
          referrer: testReferrer,
        } satisfies IDiscussionBoardContributor.ILogin,
      });
    typia.assert(loginResult);

    // Verify the login response contains valid tokens
    TestValidator.equals(
      `login with ${emailVariation} should return same contributor`,
      loginResult.id,
      registered.id,
    );
    TestValidator.predicate(
      `access token should exist for ${emailVariation}`,
      loginResult.token.access.length > 0,
    );
    TestValidator.predicate(
      `refresh token should exist for ${emailVariation}`,
      loginResult.token.refresh.length > 0,
    );
  }
}
