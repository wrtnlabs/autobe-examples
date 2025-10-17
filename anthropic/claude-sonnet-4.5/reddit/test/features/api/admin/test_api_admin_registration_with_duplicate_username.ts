import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator registration validation when attempting to create an
 * account with a username that already exists in the system.
 *
 * The test validates the global username uniqueness constraint by:
 *
 * 1. Creating an initial admin account with a specific username
 * 2. Attempting to register another admin with the same username but different
 *    email
 * 3. Verifying the system rejects the duplicate username registration
 *
 * This ensures usernames are globally unique across all user types in the
 * platform.
 */
export async function test_api_admin_registration_with_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique test data for the first admin registration
  const duplicateUsername = RandomGenerator.alphaNumeric(10);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphaNumeric(12);

  // Step 1: Create the first admin account with a specific username
  const firstAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: duplicateUsername,
        email: firstEmail,
        password: firstPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });

  // Validate the first registration succeeded
  typia.assert(firstAdmin);
  TestValidator.equals(
    "first admin username matches",
    firstAdmin.username,
    duplicateUsername,
  );
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    firstEmail,
  );

  // Step 2: Attempt to register a second admin with the same username but different email
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = RandomGenerator.alphaNumeric(12);

  // Step 3: Verify the duplicate username registration fails
  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        username: duplicateUsername,
        email: secondEmail,
        password: secondPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  });
}
