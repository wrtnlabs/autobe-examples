import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Verify that cancellation policy detail lookups hydrate region and policy
 * setting summaries.
 *
 * Business goal
 *
 * - Ensure that when a cancellation policy is created with references to a region
 *   configuration and a policy setting profile, the public detail endpoint
 *   /shoppingMall/cancellationPolicies/{cancellationPolicyCode} returns those
 *   associations as embedded ISummary DTOs rather than only raw foreign keys.
 *
 * Steps
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join. This yields an
 *    IShoppingMallPlatformAdmin.IAuthorized plus auth tokens on the
 *    connection.
 * 2. As that admin, create a policy setting via POST
 *    /shoppingMall/platformAdmin/policySettings with category "cancellation".
 * 3. As the same admin, create a region setting via POST
 *    /shoppingMall/platformAdmin/regionSettings with active=true.
 * 4. Create a cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies with:
 *
 *    - Code: deterministic string so we can later query by it
 *    - Region_code: regionSetting.code
 *    - Policy_setting_code: policySetting.code
 *    - Allow_cancellation_before_shipment=true
 *    - Allow_partial_cancellation=true
 *    - Active=true
 * 5. Call GET /shoppingMall/cancellationPolicies/{cancellationPolicyCode} using
 *    the same connection (no extra header manipulation).
 * 6. Assert that:
 *
 *    - The response is a valid IShoppingMallCancellationPolicy.
 *    - Response.code === createdPolicy.code.
 *    - Response.active === true.
 *    - Response.region_setting is defined (not null/undefined) and
 *         response.region_setting.code === regionSetting.code,
 *         response.region_setting.name === regionSetting.name,
 *         response.region_setting.active === regionSetting.active.
 *    - Response.policy_setting is defined (not null/undefined) and
 *         response.policy_setting.code === policySetting.code,
 *         response.policy_setting.name === policySetting.name,
 *         response.policy_setting.category === policySetting.category,
 *         response.policy_setting.active === policySetting.active.
 */
export async function test_api_cancellation_policy_get_by_code_with_region_and_policy_context(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also wires Authorization header on connection)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create policy setting profile in category "cancellation"
  const policyCode = `cancel_policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policyCode,
    name: "Cancellation Policy Profile",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create region setting
  const regionCode = `REG_${RandomGenerator.alphaNumeric(6)}`;
  const regionSettingBody = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionSetting: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionSettingBody },
    );
  typia.assert(regionSetting);

  // 4. Create cancellation policy associated with region and policy setting
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationPolicyBody = {
    code: cancellationPolicyCode,
    name: "Test Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionSetting.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const createdPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(createdPolicy);

  // Sanity checks on creation response
  TestValidator.equals(
    "created policy code should match input",
    createdPolicy.code,
    cancellationPolicyCode,
  );
  TestValidator.equals(
    "created policy should be active",
    createdPolicy.active,
    true,
  );

  // 5. Fetch cancellation policy by code via public endpoint
  const fetchedPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.cancellationPolicies.at(connection, {
      cancellationPolicyCode,
    });
  typia.assert(fetchedPolicy);

  // 6. Validate main policy fields
  TestValidator.equals(
    "fetched policy code should equal created code",
    fetchedPolicy.code,
    createdPolicy.code,
  );
  TestValidator.equals(
    "fetched policy should be active",
    fetchedPolicy.active,
    true,
  );
  TestValidator.equals(
    "allow_cancellation_before_shipment flag should match",
    fetchedPolicy.allow_cancellation_before_shipment,
    createdPolicy.allow_cancellation_before_shipment,
  );
  TestValidator.equals(
    "allow_partial_cancellation flag should match",
    fetchedPolicy.allow_partial_cancellation,
    createdPolicy.allow_partial_cancellation,
  );

  // 7. Validate embedded region_setting summary
  TestValidator.predicate(
    "region_setting summary should be present on fetched policy",
    fetchedPolicy.region_setting !== null &&
      fetchedPolicy.region_setting !== undefined,
  );
  if (
    fetchedPolicy.region_setting !== null &&
    fetchedPolicy.region_setting !== undefined
  ) {
    const regionSummary = fetchedPolicy.region_setting;
    TestValidator.equals(
      "region summary code should match created region code",
      regionSummary.code,
      regionSetting.code,
    );
    TestValidator.equals(
      "region summary name should match created region name",
      regionSummary.name,
      regionSetting.name,
    );
    TestValidator.equals(
      "region summary active flag should match created region active",
      regionSummary.active,
      regionSetting.active,
    );
  }

  // 8. Validate embedded policy_setting summary
  TestValidator.predicate(
    "policy_setting summary should be present on fetched policy",
    fetchedPolicy.policy_setting !== null &&
      fetchedPolicy.policy_setting !== undefined,
  );
  if (
    fetchedPolicy.policy_setting !== null &&
    fetchedPolicy.policy_setting !== undefined
  ) {
    const policySummary = fetchedPolicy.policy_setting;
    TestValidator.equals(
      "policy summary code should match created policy setting code",
      policySummary.code,
      policySetting.code,
    );
    TestValidator.equals(
      "policy summary name should match created policy setting name",
      policySummary.name,
      policySetting.name,
    );
    TestValidator.equals(
      "policy summary category should match created policy setting category",
      policySummary.category,
      policySetting.category,
    );
    TestValidator.equals(
      "policy summary active flag should match created policy setting active",
      policySummary.active,
      policySetting.active,
    );
  }
}
