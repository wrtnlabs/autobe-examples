import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator registration validation with duplicate email addresses.
 *
 * This test validates the platform-wide email uniqueness constraint for admin
 * accounts. First, it creates an admin account with a specific email address.
 * Then it attempts to register another admin account with a different username
 * but the same email. The system must reject the duplicate email registration
 * to maintain data integrity.
 *
 * Test workflow:
 *
 * 1. Register first admin account with unique username and email
 * 2. Validate successful registration and token issuance
 * 3. Attempt to register second admin with different username but same email
 * 4. Verify that duplicate email registration fails with appropriate error
 */
export async function test_api_admin_registration_with_duplicate_email(
  connection: api.IConnection,
) {
  // Generate test data for first admin account
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const firstPassword = typia.random<string & tags.MinLength<8>>();

  // Step 1: Register first admin account successfully
  const firstAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: firstUsername,
        email: sharedEmail,
        password: firstPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Validate first admin registration response
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    sharedEmail,
  );
  TestValidator.equals(
    "first admin username matches",
    firstAdmin.username,
    firstUsername,
  );

  // Generate different username for second admin attempt
  const secondUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const secondPassword = typia.random<string & tags.MinLength<8>>();

  // Step 2: Attempt to register second admin with duplicate email (should fail)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          username: secondUsername,
          email: sharedEmail, // Same email as first admin
          password: secondPassword,
        } satisfies IRedditLikeAdmin.ICreate,
      });
    },
  );
}
