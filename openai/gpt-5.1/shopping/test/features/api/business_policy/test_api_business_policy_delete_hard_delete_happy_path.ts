import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Happy-path hard delete of a business policy by an authenticated admin.
 *
 * Business context: This test ensures that an administrator who has
 * successfully joined the platform can create a business policy, verify its
 * existence, perform a hard delete using the DELETE
 * /shoppingMall/admin/businessPolicies/{policyCode} endpoint, and then confirm
 * that the policy is no longer retrievable.
 *
 * Steps:
 *
 * 1. Admin joins the platform via POST /auth/admin/join, obtaining an
 *    authenticated IShoppingMallAdmin.IAuthorized context. The SDK
 *    automatically injects the access token into the connection headers.
 * 2. The admin creates a business policy via POST
 *    /shoppingMall/admin/businessPolicies with a unique policy_code and
 *    realistic metadata.
 * 3. The test reads the policy via GET
 *    /shoppingMall/admin/businessPolicies/{policyCode} to assert that it exists
 *    pre-deletion.
 * 4. The admin calls DELETE /shoppingMall/admin/businessPolicies/{policyCode} to
 *    hard delete the policy.
 * 5. The test attempts to read the same policy again and expects an error,
 *    validating that the policy has been removed.
 */
export async function test_api_business_policy_delete_hard_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform to establish admin authentication context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new business policy with a unique policy_code
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // Validate that the created policy_code matches our requested one
  TestValidator.equals(
    "created policy_code should match requested policy_code",
    createdPolicy.policy_code,
    policyCode,
  );

  // 3. Verify existence via GET /shoppingMall/admin/businessPolicies/{policyCode}
  const fetchedBeforeDelete: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode,
    });
  typia.assert(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched policy_code before delete should match created policy_code",
    fetchedBeforeDelete.policy_code,
    createdPolicy.policy_code,
  );

  // 4. Perform hard delete via DELETE /shoppingMall/admin/businessPolicies/{policyCode}
  await api.functional.shoppingMall.admin.businessPolicies.erase(connection, {
    policyCode,
  });

  // 5. Confirm the policy is no longer retrievable after deletion
  await TestValidator.error(
    "fetching deleted business policy by policyCode should fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
        policyCode,
      });
    },
  );
}
