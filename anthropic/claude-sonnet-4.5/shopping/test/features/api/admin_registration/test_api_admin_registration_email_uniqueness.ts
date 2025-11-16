import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator registration email uniqueness constraint.
 *
 * Validates that the system prevents duplicate administrator accounts from
 * being created with the same email address. First creates an admin account
 * successfully, then attempts to register another admin with the same email but
 * different credentials, verifying that the second attempt fails
 * appropriately.
 *
 * This test ensures email uniqueness is enforced at the API level, preventing
 * unauthorized duplicate accounts and maintaining data integrity across all
 * administrator accounts in the system.
 *
 * Test Flow:
 *
 * 1. Generate unique email and complete admin registration data
 * 2. Successfully create first admin account with the email
 * 3. Attempt to create second admin account with same email but different
 *    credentials
 * 4. Verify second registration fails with appropriate error
 */
export async function test_api_admin_registration_email_uniqueness(
  connection: api.IConnection,
) {
  // Generate unique email for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Create first admin account successfully
  const firstAdminData = {
    email: duplicateEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: firstAdminData,
  });

  typia.assert(firstAdmin);

  // Step 2: Attempt to create second admin account with same email but different credentials
  const secondAdminData = {
    email: duplicateEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: false,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  // Step 3: Verify second registration fails
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: secondAdminData,
      });
    },
  );
}
