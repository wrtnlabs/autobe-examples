import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_delete_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authenticated context (token automatically set by SDK)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy as the authenticated admin
  const createBody = {
    policy_code: `refund_standard_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPolicy);

  // 3. Baseline: admin can fetch the created policy
  const fetchedByAdmin: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: createdPolicy.policy_code,
    });
  typia.assert(fetchedByAdmin);

  TestValidator.equals(
    "created and fetched policy ids must match before unauthorized deletion",
    fetchedByAdmin.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "created and fetched policy codes must match before unauthorized deletion",
    fetchedByAdmin.policy_code,
    createdPolicy.policy_code,
  );

  // 4. Attempt unauthorized DELETE with an unauthenticated connection
  // Create a new connection object with empty headers to simulate anonymous access.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated delete on business policy must fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.erase(
        unauthConn,
        {
          policyCode: createdPolicy.policy_code,
        },
      );
    },
  );

  // 5. Confirm the policy still exists after unauthorized delete attempt
  const refetchedByAdmin: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: createdPolicy.policy_code,
    });
  typia.assert(refetchedByAdmin);

  TestValidator.equals(
    "policy id must remain unchanged after unauthorized delete attempt",
    refetchedByAdmin.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "policy code must remain unchanged after unauthorized delete attempt",
    refetchedByAdmin.policy_code,
    createdPolicy.policy_code,
  );
}
