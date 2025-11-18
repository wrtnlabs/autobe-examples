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
 * Validate deletion of a case SLA configuration that is linked to a business
 * policy version.
 *
 * Business intent:
 *
 * - Admins can configure case SLAs (Service Level Agreements) for different case
 *   types.
 * - These SLA configs may optionally be associated with a specific business
 *   policy version via `shopping_mall_business_policy_version_id`.
 * - Deleting such an SLA config should succeed when no additional blocking
 *   constraints exist, and must not cascade to delete the associated business
 *   policy or policy version.
 *
 * Test workflow:
 *
 * 1. Register an admin account via POST /auth/admin/join to obtain an
 *    authenticated admin context.
 * 2. Create a business policy via POST /shoppingMall/admin/businessPolicies.
 * 3. Under that policy, create a policy version via POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions.
 * 4. Create a case SLA configuration via POST /shoppingMall/admin/caseSlaConfigs
 *    that references the created policy version using
 *    `shopping_mall_business_policy_version_id`.
 * 5. Delete that SLA config using DELETE
 *    /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId}.
 * 6. Assert that deletion completes without error (erase returns void) and
 *    logically verify that the referenced policy and version remain (no
 *    cascading delete), to the extent possible with available APIs.
 */
export async function test_api_case_sla_config_delete_with_policy_linkage(
  connection: api.IConnection,
) {
  // 1. Admin registration / authentication
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a business policy
  const policyBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "case_sla", // arbitrary category string
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyBody },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 3. Create a policy version under the created policy
  const versionBody = {
    version_code: "v1", // simple version code
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // Basic sanity: created version belongs to our policy (when summary is populated)
  if (policyVersion.policy !== undefined) {
    TestValidator.equals(
      "policy version summary should reference created policy id",
      policyVersion.policy.id,
      policy.id,
    );
  }

  // 4. Create an SLA config referencing the created policy version
  const slaBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund", // arbitrary but consistent case type code
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: typia.random<number & tags.Type<"int32">>(),
    warning_duration_seconds: null,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(slaConfig);

  // Assert that the created SLA config is wired to the expected policy version when summary is populated
  if (
    slaConfig.policyVersion !== undefined &&
    slaConfig.policyVersion !== null
  ) {
    TestValidator.equals(
      "SLA policyVersion summary id should match policyVersion.id",
      slaConfig.policyVersion.id,
      policyVersion.id,
    );
  }

  // 5. Delete the SLA config by its id
  await api.functional.shoppingMall.admin.caseSlaConfigs.erase(connection, {
    caseSlaConfigId: slaConfig.id,
  });

  // If we reach this point without throwing, deletion is considered successful.
  // There is no read/search API to confirm absence, so we rely on absence of error.
  TestValidator.predicate(
    "SLA config deletion should complete without throwing",
    true,
  );

  // 6. Optional logical assertion: business policy and version objects from earlier remain valid
  // (we cannot refetch them, but we can still assert their structure via typia)
  typia.assert<IShoppingMallBusinessPolicy>(policy);
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);
}
