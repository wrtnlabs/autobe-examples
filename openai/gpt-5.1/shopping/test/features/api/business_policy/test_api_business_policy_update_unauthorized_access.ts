import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin connection and token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a concrete business policy as this admin
  const createBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    category: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const created: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Prepare a valid update payload that would change multiple fields
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    category: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: false,
  } satisfies IShoppingMallBusinessPolicy.IUpdate;

  // 4. Attempt unauthorized update and ensure it fails
  await TestValidator.error(
    "unauthorized policy update must fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.update(
        unauthenticated,
        {
          policyCode: created.policy_code,
          body: updateBody,
        },
      );
    },
  );

  // 5. Re-fetch the policy with the valid admin connection to ensure it is unchanged
  const fetched: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: created.policy_code,
    });
  typia.assert(fetched);

  // 6. Validate that updatable fields have not changed
  TestValidator.equals(
    "policy_code must remain unchanged after unauthorized update",
    fetched.policy_code,
    created.policy_code,
  );
  TestValidator.equals(
    "name must remain unchanged after unauthorized update",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "category must remain unchanged after unauthorized update",
    fetched.category,
    created.category,
  );
  TestValidator.equals(
    "description must remain unchanged after unauthorized update",
    fetched.description ?? null,
    created.description ?? null,
  );
  TestValidator.equals(
    "is_active flag must remain unchanged after unauthorized update",
    fetched.is_active,
    created.is_active,
  );
}
