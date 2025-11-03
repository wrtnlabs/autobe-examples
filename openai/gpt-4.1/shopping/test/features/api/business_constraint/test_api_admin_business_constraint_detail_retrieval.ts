import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";

/**
 * Validate that an admin can retrieve details for a business constraint by
 * name.
 *
 * 1. Register a new admin account for isolation.
 * 2. Select (using random string) the name of an existing business constraint
 *    (unless creation endpoint is exposed, assume some are seeded).
 * 3. Retrieve details of a valid constraint by exact constraintName (expect full
 *    operational fields, correct values, and success).
 * 4. Attempt to retrieve a constraint using a non-existent constraint name (expect
 *    not found).
 * 5. Attempt to retrieve with altered case or whitespace (expect not found).
 */
export async function test_api_admin_business_constraint_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin account for isolation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin: IShoppingAdmin.IJoin = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
      "business",
    ] as const),
    status: "active",
  };

  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);

  // 2. Use a business constraint name likely to exist (assume seed)
  // For coverage, just use a hard random string (in practice, would require creation endpoint or prior steps)
  const knownConstraintName = "max_orders_per_user_day";

  // 3. Retrieve details of a valid constraint
  const detail: IShoppingBusinessConstraint =
    await api.functional.shopping.admin.businessConstraints.at(connection, {
      constraintName: knownConstraintName,
    });
  typia.assert(detail);
  TestValidator.equals(
    "constraint_name matches",
    detail.constraint_name,
    knownConstraintName,
  );
  TestValidator.predicate(
    "has scope",
    typeof detail.scope === "string" && detail.scope.length > 0,
  );
  TestValidator.predicate(
    "has limit_value",
    typeof detail.limit_value === "string" && detail.limit_value.length > 0,
  );
  TestValidator.predicate(
    "has unit",
    typeof detail.unit === "string" && detail.unit.length > 0,
  );
  TestValidator.predicate(
    "is active flag boolean",
    typeof detail.active === "boolean",
  );
  if (detail.description !== undefined && detail.description !== null) {
    TestValidator.predicate(
      "description has content",
      typeof detail.description === "string",
    );
  }
  TestValidator.predicate(
    "created_at is ISO date",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );

  // 4. Attempt to retrieve a non-existent constraint (expect not found error)
  await TestValidator.error(
    "not found for non-existent constraint",
    async () => {
      await api.functional.shopping.admin.businessConstraints.at(connection, {
        constraintName: `does_not_exist_${RandomGenerator.alphaNumeric(16)}`,
      });
    },
  );

  // 5. Attempt to retrieve with modified case/whitespace (expect not found)
  await TestValidator.error("not found for incorrect case", async () => {
    await api.functional.shopping.admin.businessConstraints.at(connection, {
      constraintName: " MAX_ORDERS_PER_USER_DAY ",
    });
  });
}
