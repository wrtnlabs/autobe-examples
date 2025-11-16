import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin registration rejection when attempting to register with an already
 * existing email address.
 *
 * This test validates the email uniqueness constraint enforcement in the
 * todo_list_admins table. The scenario follows these steps:
 *
 * 1. Create the first admin account with a specific email address
 * 2. Verify the first registration succeeds and returns proper authentication
 *    tokens
 * 3. Attempt to register a second admin account using the same email address
 * 4. Verify that the second registration fails with an appropriate error
 *
 * This ensures the system properly prevents duplicate admin accounts,
 * maintaining data integrity and security by enforcing email uniqueness at the
 * database level.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Create the first admin account
  const firstAdminData = {
    email: duplicateEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: firstAdminData,
  });
  typia.assert(firstAdmin);

  // Verify the first admin was created successfully
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    duplicateEmail,
  );
  TestValidator.predicate(
    "first admin has valid token",
    firstAdmin.token.access.length > 0 && firstAdmin.token.refresh.length > 0,
  );

  // Attempt to create a second admin with the same email
  const secondAdminData = {
    email: duplicateEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  // This should fail due to email uniqueness constraint
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: secondAdminData,
      });
    },
  );
}
