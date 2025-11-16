import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator registration validation when attempting to create an
 * account with a username that already exists in the system.
 *
 * This test validates that the platform's administrator registration endpoint
 * enforces username uniqueness constraints. The registration process must
 * prevent creating multiple administrator accounts with the same username, as
 * usernames serve as immutable identifiers for administrative accountability in
 * audit logs.
 *
 * Test workflow:
 *
 * 1. Create the first administrator account with a unique username
 * 2. Attempt to create a second administrator account using the same username
 * 3. Verify that the duplicate registration fails with an appropriate error
 * 4. Confirm that no additional administrator record was created
 */
export async function test_api_administrator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Create the first administrator account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = "SecurePassword123!";
  const adminName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();

  const firstAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: password,
        username: username,
        name: adminName,
        href: href,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });

  typia.assert(firstAdmin);
  TestValidator.equals(
    "first admin username matches",
    firstAdmin.username,
    username,
  );

  // Step 2: Attempt to create a second administrator with the same username
  // This should fail because username must be unique
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminName = RandomGenerator.name();

  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: secondAdminEmail,
          password: password,
          username: username, // Using the same username as first admin
          name: secondAdminName,
          href: href,
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Step 3: Verify that the first administrator account remains unchanged
  // and only one admin account exists with the duplicate username
  TestValidator.equals(
    "first admin email should remain unchanged",
    firstAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "first admin name should remain unchanged",
    firstAdmin.username,
    username,
  );
}
