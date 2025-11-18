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
 * Validate that an authenticated admin can create and then delete a case SLA
 * configuration.
 *
 * Business context:
 *
 * - Case SLA configurations (IShoppingMallCaseSlaConfig) define time-based rules
 *   for handling marketplace cases (cancellation, refund, dispute, etc.).
 * - Only admins can manage these configurations through the
 *   /shoppingMall/admin/caseSlaConfigs endpoints.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/admin/join.
 *
 *    - Use a realistic IShoppingMallAdminJoin.ICreate payload (email, password, ip?,
 *         href, referrer).
 *    - The SDK will automatically install the Authorization header on the shared
 *         connection.
 *    - Assert the IShoppingMallAdmin.IAuthorized response with typia.assert.
 * 2. As this admin, create a new SLA config via POST
 *    /shoppingMall/admin/caseSlaConfigs.
 *
 *    - Build an IShoppingMallCaseSlaConfig.ICreate body with:
 *
 *         - Case_type: a string such as "refund".
 *         - Actor_role: a string such as "seller".
 *         - Action_type: a string such as "initial_response".
 *         - Target_duration_seconds: a reasonable positive int32 (e.g., 3600 for 1 hour).
 *         - Is_active: true.
 *         - Omit optional shopping_mall_business_policy_version_id and
 *                   warning_duration_seconds for this minimal scenario.
 *    - Assert the returned IShoppingMallCaseSlaConfig with typia.assert.
 *    - Use TestValidator.predicate to confirm key business fields match the request
 *         (case_type, actor_role, action_type, is_active) to ensure we created
 *         what we intended.
 * 3. Delete the SLA config via DELETE
 *    /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId}.
 *
 *    - Call api.functional.shoppingMall.admin.caseSlaConfigs.erase with the id from
 *         step 2.
 *    - The operation returns void; success is inferred from absence of error, so do
 *         not attempt to assert HTTP status or response body.
 * 4. Optionally, use a simple TestValidator.predicate after the erase call to
 *    assert that execution reached that point without throwing, documenting
 *    successful deletion.
 */
export async function test_api_case_sla_config_delete_simple_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; omit it for simplicity in this scenario
    href: "https://admin.shoppingmall.test/join", // realistic frontend URL
    referrer: "https://shoppingmall.test/landing", // realistic referrer URL
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new case SLA configuration as this admin
  const createBody = {
    // Optional shopping_mall_business_policy_version_id is omitted in this simple case
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    // No pre-breach warning in this minimal scenario
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(createdConfig);

  // Validate that key business fields of the created configuration match the request
  TestValidator.predicate(
    "created SLA config matches requested core fields",
    () =>
      createdConfig.case_type === createBody.case_type &&
      createdConfig.actor_role === createBody.actor_role &&
      createdConfig.action_type === createBody.action_type &&
      createdConfig.is_active === createBody.is_active,
  );

  // 3. Delete the SLA configuration using its id
  await api.functional.shoppingMall.admin.caseSlaConfigs.erase(connection, {
    caseSlaConfigId: createdConfig.id,
  });

  // 4. Sanity check: if we reached this point without an error, deletion succeeded.
  TestValidator.predicate("erase operation completed without throwing", true);
}
