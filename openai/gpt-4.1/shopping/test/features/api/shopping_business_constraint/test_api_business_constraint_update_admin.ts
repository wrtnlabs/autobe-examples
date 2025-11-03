import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";

/**
 * E2E test for admin updating an existing business constraint via
 * /shopping/admin/businessConstraints/{constraintName} PUT endpoint.
 *
 * Scenario:
 *
 * 1. Register a new admin for authentication (admin only operation).
 * 2. Create a unique business constraint (constraintA) for update testing.
 * 3. Update constraintA with new limit_value, unit, and active fields; verify
 *    response matches updates and preserves audit fields.
 * 4. Create a second distinct business constraint (constraintB).
 * 5. Attempt to update constraintA to have the same constraint_name and scope as
 *    constraintB, assert uniqueness constraint violation (expect error).
 * 6. Try updating constraintA without admin (simulate unauthenticated); expect
 *    access denied.
 */
export async function test_api_business_constraint_update_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminRegister = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      name: RandomGenerator.name(),
      role: RandomGenerator.pick(["super", "operator", "compliance"] as const),
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminRegister);

  // 2. Create constraintA
  const constraintA_create = {
    constraint_name: `ctrA_${RandomGenerator.alphaNumeric(10)}`,
    scope: `scopeA_${RandomGenerator.alphaNumeric(6)}`,
    limit_value: "100",
    unit: "count",
    description: "Original constraint A.",
    active: true,
  } satisfies IShoppingBusinessConstraint.ICreate;
  const constraintA =
    await api.functional.shopping.admin.businessConstraints.create(connection, {
      body: constraintA_create,
    });
  typia.assert(constraintA);

  // 3. Update constraintA fields
  const constraintA_update = {
    constraint_name: constraintA.constraint_name,
    scope: constraintA.scope,
    limit_value: "250",
    unit: "items",
    active: false,
    description: "Updated constraint A.",
  } satisfies IShoppingBusinessConstraint.IUpdate;
  const updatedA =
    await api.functional.shopping.admin.businessConstraints.update(connection, {
      constraintName: constraintA.constraint_name,
      body: constraintA_update,
    });
  typia.assert(updatedA);
  TestValidator.equals("updated limit_value", updatedA.limit_value, "250");
  TestValidator.equals("updated unit", updatedA.unit, "items");
  TestValidator.equals("updated active", updatedA.active, false);
  TestValidator.equals(
    "updated description",
    updatedA.description,
    "Updated constraint A.",
  );

  // Audit: id stays the same, updated_at has changed
  TestValidator.equals("id not changed by update", updatedA.id, constraintA.id);
  TestValidator.notEquals(
    "updated_at updated",
    updatedA.updated_at,
    constraintA.updated_at,
  );

  // 4. Create constraintB
  const constraintB_create = {
    constraint_name: `ctrB_${RandomGenerator.alphaNumeric(10)}`,
    scope: `scopeB_${RandomGenerator.alphaNumeric(6)}`,
    limit_value: "42",
    unit: "hours",
    description: "Constraint B.",
    active: true,
  } satisfies IShoppingBusinessConstraint.ICreate;
  const constraintB =
    await api.functional.shopping.admin.businessConstraints.create(connection, {
      body: constraintB_create,
    });
  typia.assert(constraintB);

  // 5. Attempt uniqueness violation: update A to have B's name+scope
  await TestValidator.error(
    "uniqueness constraint_name+scope violation triggers error",
    async () => {
      await api.functional.shopping.admin.businessConstraints.update(
        connection,
        {
          constraintName: constraintA.constraint_name,
          body: {
            constraint_name: constraintB.constraint_name,
            scope: constraintB.scope,
            limit_value: "777",
            unit: "dup_unit",
            active: true,
            description: "Trying collision update.",
          } satisfies IShoppingBusinessConstraint.IUpdate,
        },
      );
    },
  );

  // 6. Negative: Try updating constraint as unauthenticated
  // Simulate unauthenticated connection by removing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin unauthorized update attempt should fail",
    async () => {
      await api.functional.shopping.admin.businessConstraints.update(
        unauthConn,
        {
          constraintName: constraintA.constraint_name,
          body: constraintA_update,
        },
      );
    },
  );
}
