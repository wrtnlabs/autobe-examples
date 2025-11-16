import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate creation of a region configuration when platform-level policy
 * artifacts already exist.
 *
 * This E2E test exercises the happy-path workflow for creating a new
 * `shopping_mall_region_settings` entry via `POST
 * /shoppingMall/platformAdmin/regionSettings`, in a context where the platform
 * already has a policy setting profile, a cancellation policy, and a refund
 * policy configured. The goal is to verify that pre-existing policies do not
 * block or interfere with region creation and that the region is persisted with
 * the expected attributes and lifecycle fields.
 *
 * High-level steps:
 *
 * 1. Bootstrap a new platform administrator using `POST /auth/platformAdmin/join`.
 *
 *    - This both creates the admin identity and configures the SDK connection with a
 *         valid Authorization header via the returned JWT access token.
 * 2. As this authenticated platform admin, create a reusable policy setting
 *    profile using `POST /shoppingMall/platformAdmin/policySettings`.
 *
 *    - Use a unique `code`, a descriptive `name`, category such as "refund", and set
 *         `active` to true with an immediate effective window.
 * 3. Create a cancellation policy via `POST
 *    /shoppingMall/platformAdmin/cancellationPolicies`.
 *
 *    - Use a unique business `code` and simple allow_* flags.
 *    - Do not bind it to any region or policy setting (leave `region_code` and
 *         `policy_setting_code` undefined/null) so that it simply co-exists in
 *         the system.
 * 4. Create a refund policy via `POST /shoppingMall/platformAdmin/refundPolicies`.
 *
 *    - Supply its own unique `code`, a `name`, and behavior flags, including
 *         full/partial refund allowance, a non-negative refund window, and an
 *         active flag.
 *    - Set `policySettingCode` to the code of the policy setting profile from step
 *         2, while leaving `regionCode` null so that it is not yet scoped to a
 *         concrete region.
 * 5. Create a new region configuration using `POST
 *    /shoppingMall/platformAdmin/regionSettings`.
 *
 *    - Provide a unique `code` (e.g., "US_EAST_TEST"), `name`, `active: true`, and
 *         realistic optional metadata (`iso_country_code`, `currency_code`,
 *         `timezone`).
 *
 * Assertions and checks:
 *
 * - Each API call completes successfully using the joined admin connection (no
 *   TestValidator.error branches are needed in this positive-flow scenario).
 * - The responses from the policy setting, cancellation policy, and refund policy
 *   creation endpoints all pass `typia.assert(...)`, ensuring strong type-level
 *   validation of the returned DTOs.
 * - For the region creation response:
 *
 *   - `typia.assert` on `IShoppingMallRegionSetting` succeeds, confirming that
 *       server-managed fields (`id`, `created_at`, `updated_at`) and optional
 *       `deleted_at` are correctly shaped.
 *   - `code`, `name`, and `active` match the original ICreate payload exactly.
 *   - The optional metadata fields (`iso_country_code`, `currency_code`,
 *       `timezone`) mirror the provided values.
 *   - `deleted_at` is null for the newly created region.
 * - The existence of preconfigured policies, including a refund policy that
 *   references the policy setting profile, does not prevent the creation of the
 *   new region or cause any uniqueness conflicts on business codes.
 */
export async function test_api_region_settings_creation_with_preconfigured_policies(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin via join (also sets Authorization header)
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.example.com/join",
    referrer: "https://admin.test.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a reusable policy setting profile
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingCreate = {
    code: policySettingCode,
    name: "Refund Policy Profile for Region Creation Test",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);

  TestValidator.equals(
    "policy setting code should match request",
    policySetting.code,
    policySettingCode,
  );

  // 3. Create a cancellation policy that does not target any region yet
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationPolicyCreate = {
    code: cancellationPolicyCode,
    name: "Generic Cancellation Policy for Region Creation Test",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreate },
    );
  typia.assert(cancellationPolicy);

  TestValidator.equals(
    "cancellation policy code should match request",
    cancellationPolicy.code,
    cancellationPolicyCode,
  );

  // 4. Create a refund policy referencing the policy setting profile
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundPolicyCreate = {
    code: refundPolicyCode,
    name: "Refund Policy Linked to Policy Setting Profile",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreate },
    );
  typia.assert(refundPolicy);

  TestValidator.equals(
    "refund policy code should match request",
    refundPolicy.code,
    refundPolicyCode,
  );
  TestValidator.equals(
    "refund policy should reference policy setting profile code",
    refundPolicy.policySettingCode,
    policySetting.code,
  );

  // 5. Create a new region configuration
  const regionCode = `US_EAST_${RandomGenerator.alphaNumeric(6)}`;
  const regionCreate = {
    code: regionCode,
    name: "US East Test Region",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);

  // Validate region attributes
  TestValidator.equals(
    "region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region name should match request",
    region.name,
    regionCreate.name,
  );
  TestValidator.equals(
    "region active flag should be true",
    region.active,
    true,
  );
  TestValidator.equals(
    "region iso_country_code should match request",
    region.iso_country_code ?? null,
    regionCreate.iso_country_code ?? null,
  );
  TestValidator.equals(
    "region currency_code should match request",
    region.currency_code ?? null,
    regionCreate.currency_code ?? null,
  );
  TestValidator.equals(
    "region timezone should match request",
    region.timezone ?? null,
    regionCreate.timezone ?? null,
  );

  TestValidator.equals(
    "region should not be soft-deleted on creation",
    region.deleted_at ?? null,
    null,
  );
}
