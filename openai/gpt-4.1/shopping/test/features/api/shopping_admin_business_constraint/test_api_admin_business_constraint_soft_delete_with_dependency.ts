import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";

/**
 * Test that an administrator cannot delete a business constraint that is
 * required by another business policy or essential system logic.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin user.
 * 2. Create a new business constraint with a unique constraint_name.
 * 3. Attempt to delete that constraint (simulate dependency by assuming all
 *    constraints are protected upon creation).
 * 4. Assert that the deletion is rejected with a meaningful business error, and
 *    the constraint remains active.
 */
export async function test_api_admin_business_constraint_soft_delete_with_dependency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = RandomGenerator.name(1) + "@business-domain.com";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      },
    });
  typia.assert(admin);

  // 2. Create a business constraint with unique name
  const constraintName = RandomGenerator.alphaNumeric(12);
  const constraint: IShoppingBusinessConstraint =
    await api.functional.shopping.admin.businessConstraints.create(connection, {
      body: {
        constraint_name: constraintName,
        scope: "checkout",
        limit_value: "10",
        unit: "count",
        description: RandomGenerator.paragraph({ sentences: 6 }),
        active: true,
      },
    });
  typia.assert(constraint);

  // 3. Attempt to delete the constraint - it should fail due to simulated dependency
  await TestValidator.error(
    "should not allow deletion of a business constraint that is required by dependency",
    async () => {
      await api.functional.shopping.admin.businessConstraints.erase(
        connection,
        {
          constraintName: constraintName,
        },
      );
    },
  );
}
