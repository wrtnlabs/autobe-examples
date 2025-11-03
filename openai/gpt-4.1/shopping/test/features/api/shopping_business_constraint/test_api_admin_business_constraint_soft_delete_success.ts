import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";

/**
 * Validate successful soft-deletion of a business constraint as an admin.
 *
 * 1. Register a new admin account to gain authentication for admin endpoints.
 * 2. Create a new business constraint using the create endpoint
 * 3. Issue a DELETE request to
 *    /shopping/admin/businessConstraints/{constraintName} with the name of the
 *    just-created constraint
 * 4. Validate the business constraint is soft-deleted (deleted_at is set). Do so
 *    by re-creating the constraint with the same constraint_name and expecting
 *    a business error, or, if the API allows, by attempting to retrieve the
 *    deleted constraint and checking for the presence of a non-null
 *    deleted_at.
 * 5. Optionally check audit logs for compliance, if available.
 */
export async function test_api_admin_business_constraint_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Admin registration/authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a business constraint
  const uniqueConstraintName =
    "test_constraint_" + RandomGenerator.alphaNumeric(8);
  const createInput = {
    constraint_name: uniqueConstraintName,
    scope: RandomGenerator.pick([
      "cart",
      "products",
      "orders",
      "checkout",
      "global",
    ] as const),
    limit_value: String(RandomGenerator.pick([10, 50, 100, 2])),
    unit: RandomGenerator.pick(["count", "days", "amount", "seconds"] as const),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
  } satisfies IShoppingBusinessConstraint.ICreate;
  const constraint: IShoppingBusinessConstraint =
    await api.functional.shopping.admin.businessConstraints.create(connection, {
      body: createInput,
    });
  typia.assert(constraint);
  TestValidator.equals(
    "created constraint_name matches input",
    constraint.constraint_name,
    uniqueConstraintName,
  );
  TestValidator.equals("created constraint is active", constraint.active, true);
  TestValidator.equals(
    "created constraint deleted_at should be null",
    constraint.deleted_at,
    null,
  );

  // 3. Soft-delete the constraint by name
  await api.functional.shopping.admin.businessConstraints.erase(connection, {
    constraintName: uniqueConstraintName,
  });

  // 4. Attempt to recreate with the same name, expecting a uniqueness violation error (ensures soft-deleted, not hard-removed)
  await TestValidator.error(
    "cannot recreate constraint with existing (soft-deleted) constraint_name",
    async () => {
      await api.functional.shopping.admin.businessConstraints.create(
        connection,
        {
          body: createInput,
        },
      );
    },
  );

  // 5. Optionally, if the API has a way to fetch by name, validate deleted_at (skipped if not supported)
}
