import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";

/**
 * Validate creation of a shopping business policy by a platform admin.
 *
 * 1. Register and authenticate as an admin
 * 2. Create a valid business policy (all required fields, expected types)
 * 3. Attempt to create a duplicate policy with the same (policy_name, scope) to
 *    check uniqueness error
 * 4. Attempt creation with invalid fields (missing/empty required value, invalid
 *    value business logic)
 * 5. Attempt unauthenticated creation (simulate by stripping admin token, should
 *    fail)
 * 6. Validate that the created policy object can be referenced immediately (by at
 *    least direct response contents)
 */
export async function test_api_admin_business_policy_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin with valid data
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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
  typia.assert(adminJoin);

  // 2. Create a valid business policy
  const uniquePolicyName = `policy_${RandomGenerator.alphaNumeric(10)}`;
  const uniqueScope = `scope_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    policy_name: uniquePolicyName,
    scope: uniqueScope,
    value: "42",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
  } satisfies IShoppingBusinessPolicy.ICreate;
  const policy = await api.functional.shopping.admin.businessPolicies.create(
    connection,
    { body: createBody },
  );
  typia.assert(policy);
  TestValidator.equals(
    "created policy fields",
    policy.policy_name,
    uniquePolicyName,
  );
  TestValidator.equals("created policy scope", policy.scope, uniqueScope);
  TestValidator.equals("created policy is active", policy.active, true);

  // 3. Attempt to create a duplicate policy (should cause uniqueness error)
  await TestValidator.error(
    "duplicate policy_name/scope should fail",
    async () => {
      await api.functional.shopping.admin.businessPolicies.create(connection, {
        body: createBody,
      });
    },
  );

  // 4. Attempt creation with missing required fields (policy_name missing)
  await TestValidator.error(
    "missing required policy_name should fail",
    async () => {
      await api.functional.shopping.admin.businessPolicies.create(connection, {
        body: {
          ...createBody,
          policy_name: "",
        } satisfies IShoppingBusinessPolicy.ICreate,
      });
    },
  );

  // 4b. Attempt creation with empty description
  await TestValidator.error("empty description should fail", async () => {
    await api.functional.shopping.admin.businessPolicies.create(connection, {
      body: {
        ...createBody,
        description: "",
      } satisfies IShoppingBusinessPolicy.ICreate,
    });
  });

  // 5. Attempt creation unauthenticated (simulate by creating new connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated creation should fail",
    async () => {
      await api.functional.shopping.admin.businessPolicies.create(unauthConn, {
        body: createBody,
      });
    },
  );
}
