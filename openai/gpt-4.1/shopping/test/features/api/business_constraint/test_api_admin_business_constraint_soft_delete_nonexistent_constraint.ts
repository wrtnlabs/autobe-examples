import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate deletion attempt of a non-existent business constraint by an admin.
 *
 * This e2e test ensures that when an admin tries to soft delete a business
 * constraint with a constraintName that does not exist, the backend returns a
 * business policy error and does not process any soft delete operation, thereby
 * ensuring idempotence and correct business logic.
 *
 * 1. Register a random admin account using api.functional.auth.admin.join.
 * 2. Attempt to soft delete a business constraint via
 *    api.functional.shopping.admin.businessConstraints.erase, using a randomly
 *    generated string for constraintName (minimize the chance it’s present in
 *    the db).
 * 3. Assert that the erase call fails (throws an error) as the constraint does not
 *    exist, using TestValidator.error.
 * 4. (Comment only) Optionally, if backend exposes audit logging via API, verify
 *    the failed event is logged.
 */
export async function test_api_admin_business_constraint_soft_delete_nonexistent_constraint(
  connection: api.IConnection,
) {
  // 1. Register a random admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "suspended",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;

  const adminAuthorized: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Attempt to delete a non-existent business constraint
  const randomConstraintName = `${RandomGenerator.alphaNumeric(24)}-notfound`; // Reduce collision chance
  await TestValidator.error(
    "deleting non-existent business constraint should fail",
    async () => {
      await api.functional.shopping.admin.businessConstraints.erase(
        connection,
        {
          constraintName: randomConstraintName,
        },
      );
    },
  );

  // 3. (Optionally) Audit log assertion
  // NOTE: If the backend exposes audit trail APIs, query for an entry containing
  //   constraintName: randomConstraintName and eventType: "DELETE_ATTEMPT_FAILED"
  //   to confirm audit trail for compliance. Not implemented here due to lacking SDK.
}
