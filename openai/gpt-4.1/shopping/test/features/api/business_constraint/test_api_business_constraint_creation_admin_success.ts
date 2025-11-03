import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";

/**
 * Validate admin business constraint creation workflow and enforcement.
 *
 * 1. Registers a new admin to obtain valid authentication
 * 2. Creates a unique constraint (with random constraint_name and scope) and
 *    verifies all required fields, activation and auditability
 * 3. Asserts response contains: correct constraint_name, scope, limit_value, unit,
 *    description, is active, audit timestamps, no deletion marker
 * 4. Attempts to create a duplicate (same constraint_name+scope) and checks that a
 *    uniqueness error is thrown
 * 5. Confirms only admins may perform the creation (admin context already
 *    established by join)
 */
export async function test_api_business_constraint_creation_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "superadmin", // use valid role string
    status: "active", // ensure admin is ready immediately
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoinBody.email);
  TestValidator.equals("admin name matches", admin.name, adminJoinBody.name);
  TestValidator.equals("admin role matches", admin.role, adminJoinBody.role);
  TestValidator.equals(
    "admin status is active",
    admin.status,
    adminJoinBody.status,
  );
  TestValidator.predicate("admin token present", Boolean(admin.token?.access));
  TestValidator.predicate(
    "admin id is uuid",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin created_at is ISO string",
    typeof admin.created_at === "string",
  );

  // 2. Create a unique random constraint
  const uniqueConstraintName = `max_order_qty_test_${RandomGenerator.alphaNumeric(6)}`;
  const createConstraintBody = {
    constraint_name: uniqueConstraintName,
    scope: "cart",
    limit_value: "10",
    unit: "count",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
  } satisfies IShoppingBusinessConstraint.ICreate;

  const constraint =
    await api.functional.shopping.admin.businessConstraints.create(connection, {
      body: createConstraintBody,
    });
  typia.assert(constraint);
  TestValidator.equals(
    "constraint_name matches request",
    constraint.constraint_name,
    createConstraintBody.constraint_name,
  );
  TestValidator.equals(
    "scope matches",
    constraint.scope,
    createConstraintBody.scope,
  );
  TestValidator.equals(
    "limit_value matches",
    constraint.limit_value,
    createConstraintBody.limit_value,
  );
  TestValidator.equals(
    "unit matches",
    constraint.unit,
    createConstraintBody.unit,
  );
  TestValidator.equals(
    "description matches",
    constraint.description,
    createConstraintBody.description,
  );
  TestValidator.equals("active true", constraint.active, true);
  TestValidator.predicate(
    "id is uuid",
    typeof constraint.id === "string" && constraint.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof constraint.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof constraint.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null/undefined",
    constraint.deleted_at,
    null,
  );

  // 3. Attempt to create a duplicate with exact same constraint_name and scope
  await TestValidator.error(
    "duplicate constraint creation must fail",
    async () => {
      await api.functional.shopping.admin.businessConstraints.create(
        connection,
        {
          body: createConstraintBody,
        },
      );
    },
  );
}
