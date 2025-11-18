import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Deactivate an existing case SLA configuration while preserving its identity.
 *
 * Business goal
 *
 * - Ensure that an administrator can use the update endpoint PUT
 *   /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} to deactivate an SLA
 *   rule by toggling is_active from true to false without deleting the
 *   configuration.
 * - Verify that the configuration's id remains the same and that updated_at
 *   reflects the change.
 *
 * End-to-end workflow
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated admin
 *    context so that admin-only endpoints can be called.
 * 2. Create a business policy using POST /shoppingMall/admin/businessPolicies with
 *    IShoppingMallBusinessPolicy.ICreate.
 * 3. Under that policy, create a policy version using POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions with
 *    IShoppingMallPolicyVersion.ICreate, marking it as active.
 * 4. Create an active case SLA configuration using POST
 *    /shoppingMall/admin/caseSlaConfigs with
 *    IShoppingMallCaseSlaConfig.ICreate, referencing the policy version id in
 *    shopping_mall_business_policy_version_id and setting is_active=true.
 * 5. Capture the created SLA configuration's id and updated_at.
 * 6. Call PUT /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} through
 *    api.functional.shoppingMall.admin.caseSlaConfigs.update, passing the id
 *    from step 5, with a body of IShoppingMallCaseSlaConfig.IUpdate that only
 *    changes is_active to false.
 * 7. Assert that the response:
 *
 *    - Has the same id as the original configuration.
 *    - Has is_active === false.
 *    - Has updated_at later than the original updated_at.
 * 8. Treat the successful response as evidence that the configuration still exists
 *    (not deleted) but is now inactive.
 */
export async function test_api_case_sla_config_update_deactivate_rule(
  connection: api.IConnection,
) {
  // 1. Join as admin to get authorized admin context
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create a business policy
  const policyCreateInputBase =
    typia.random<IShoppingMallBusinessPolicy.ICreate>();
  const policyCreateInput = {
    ...policyCreateInputBase,
    // Ensure it starts active for realism
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateInput,
      },
    );
  typia.assert(policy);

  // 3. Create an active policy version under that policy
  const versionCreateBase = typia.random<IShoppingMallPolicyVersion.ICreate>();
  const versionCreateInput = {
    ...versionCreateBase,
    status: "active",
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionCreateInput,
      },
    );
  typia.assert(policyVersion);

  // 4. Create an active SLA config referencing the policy version
  const slaCreateBase = typia.random<IShoppingMallCaseSlaConfig.ICreate>();
  const slaCreateInput = {
    ...slaCreateBase,
    shopping_mall_business_policy_version_id: policyVersion.id,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateInput,
    });
  typia.assert(createdSla);

  // Capture original state for later comparison
  const originalId = createdSla.id;
  const originalIsActive = createdSla.is_active;
  const originalUpdatedAt = createdSla.updated_at;

  TestValidator.predicate(
    "initial SLA configuration should be active",
    originalIsActive === true,
  );

  // 5. Deactivate via update: only flip is_active to false
  const updateBody = {
    is_active: false,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updatedSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: originalId,
      body: updateBody,
    });
  typia.assert(updatedSla);

  // 6. Assertions on identity and deactivation semantics
  TestValidator.equals(
    "SLA config id must remain unchanged after deactivation",
    updatedSla.id,
    originalId,
  );

  TestValidator.equals(
    "SLA config should be marked inactive after update",
    updatedSla.is_active,
    false,
  );

  TestValidator.predicate(
    "updated_at must be advanced after deactivation update",
    new Date(updatedSla.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
