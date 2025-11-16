import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin account retrieval across different administrative privilege
 * levels.
 *
 * This test validates that the privilege level hierarchy (super_admin,
 * moderator, support) is correctly stored and retrieved through the admin
 * account retrieval endpoint.
 *
 * Test workflow:
 *
 * 1. Create an authenticating admin account (super_admin)
 * 2. Create three test admin accounts with different privilege levels
 * 3. Authenticate as the first admin
 * 4. Retrieve each test admin account via the retrieval endpoint
 * 5. Verify that admin_level field matches the assigned privilege level for each
 *    account
 * 6. Validate complete data consistency and no corruption of privilege information
 */
export async function test_api_admin_account_retrieval_different_privilege_levels(
  connection: api.IConnection,
) {
  // Step 1: Create authenticating admin account (super_admin)
  const authAdminEmail = typia.random<string & tags.Format<"email">>();
  const authAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: authAdminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(authAdmin);

  // Step 2: Create test admin accounts with different privilege levels
  const privilegeLevels = ["super_admin", "moderator", "support"] as const;

  const testAdmins = await ArrayUtil.asyncMap(
    privilegeLevels,
    async (level) => {
      const adminEmail = typia.random<string & tags.Format<"email">>();
      const admin = await api.functional.auth.admin.join(connection, {
        body: {
          email: adminEmail,
          password: typia.random<string & tags.Format<"password">>(),
          full_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          admin_level: level,
          email_verified: true,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallAdmin.ICreate,
      });
      typia.assert(admin);
      return { level, admin };
    },
  );

  // Step 3: Authenticate as the first admin (already authenticated from join)
  // The join operation already sets the authorization token in connection.headers

  // Step 4 & 5: Retrieve each test admin and verify privilege levels
  await ArrayUtil.asyncForEach(testAdmins, async ({ level, admin }) => {
    const retrieved = await api.functional.shoppingMall.admin.admins.at(
      connection,
      {
        adminId: admin.id,
      },
    );
    typia.assert(retrieved);

    // Verify that the admin_level matches the expected privilege level
    TestValidator.equals(
      `admin_level should be ${level}`,
      retrieved.admin_level,
      level,
    );

    // Verify basic admin information consistency
    TestValidator.equals(
      "retrieved admin ID matches created admin",
      retrieved.id,
      admin.id,
    );
    TestValidator.equals(
      "retrieved admin email matches created admin",
      retrieved.email,
      admin.email,
    );
    TestValidator.equals(
      "retrieved admin full_name matches created admin",
      retrieved.full_name,
      admin.full_name,
    );
    TestValidator.equals(
      "retrieved admin phone_number matches created admin",
      retrieved.phone_number,
      admin.phone_number,
    );
    TestValidator.equals(
      "retrieved admin email_verified matches created admin",
      retrieved.email_verified,
      admin.email_verified,
    );
  });
}
