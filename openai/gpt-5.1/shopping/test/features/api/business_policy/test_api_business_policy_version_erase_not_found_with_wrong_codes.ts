import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Verify that erasing a business policy version with non-existent identifiers
 * fails without affecting existing data.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain authenticated context.
 * 2. Create a business policy via POST /shoppingMall/admin/businessPolicies.
 * 3. Create a policy version under that policy via POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions.
 * 4. Attempt to erase a version using a wrong policyCode but correct versionCode,
 *    expecting an error.
 * 5. Attempt to erase a version using a correct policyCode but wrong versionCode,
 *    expecting an error.
 *
 * Since no read/list endpoints are available for policies or versions in this
 * test context, the test focuses on error behavior of the erase operation when
 * provided invalid composite identifiers.
 */
export async function test_api_business_policy_version_erase_not_found_with_wrong_codes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join (setup authenticated admin context)
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert(admin);

  // 2. Create a business policy
  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: typia.random<IShoppingMallBusinessPolicy.ICreate>(),
      },
    );
  typia.assert(policy);

  // 3. Create a policy version under the created policy
  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: typia.random<IShoppingMallPolicyVersion.ICreate>(),
      },
    );
  typia.assert(version);

  // 4. Error scenario A: non-existent policyCode with existing versionCode
  const wrongPolicyCode: string = `${policy.policy_code}_nonexistent`;
  await TestValidator.error(
    "erase must fail when policyCode does not exist",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        connection,
        {
          policyCode: wrongPolicyCode,
          versionCode: version.version_code,
        },
      );
    },
  );

  // 5. Error scenario B: existing policyCode with non-existent versionCode
  const wrongVersionCode: string = `${version.version_code}_nonexistent`;
  await TestValidator.error(
    "erase must fail when versionCode does not exist under existing policyCode",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        connection,
        {
          policyCode: policy.policy_code,
          versionCode: wrongVersionCode,
        },
      );
    },
  );
}
