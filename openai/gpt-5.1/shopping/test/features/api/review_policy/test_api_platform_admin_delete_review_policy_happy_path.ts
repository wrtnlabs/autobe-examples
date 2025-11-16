import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

/**
 * Happy-path E2E: platform admin deletes an existing review policy by business
 * code.
 *
 * Business context
 *
 * - Review behavior is governed by review policies that may be scoped to regions
 *   and shared policy-setting profiles. Deleting a review policy should only be
 *   possible for an authenticated platform administrator and only when a
 *   concrete policy row exists.
 *
 * Test flow
 *
 * 1. Register (join) a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This establishes the platformAdmin actor and also configures the connection
 *         with a valid bearer token via the SDK.
 * 2. As this platform admin, create a policy setting profile using POST
 *    /shoppingMall/platformAdmin/policySettings.
 *
 *    - Use a distinctive code (e.g., "review_policy_setting_<random>") and category
 *         "review" so that it is semantically aligned with review policies.
 * 3. Create a cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies.
 *
 *    - Use a unique cancellation policy code and set basic flags/fields so the
 *         entity is valid. Region/policy-setting linkage is optional here and
 *         not required by the deletion scenario.
 * 4. Create a refund policy via POST /shoppingMall/platformAdmin/refundPolicies.
 *
 *    - Use a unique refund policy code and make it active. Region/policy-setting
 *         linkage can be omitted or aligned with the same region/policy setting
 *         as the review policy if desired.
 * 5. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings.
 *
 *    - Use a recognizable region code such as "EU_MARKET_<random>" and mark it
 *         active. This will later be associated with the age restriction and
 *         review policies.
 * 6. Create an age restriction policy via POST
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies.
 *
 *    - Use a unique age restriction policy code and set minimum_age_years and
 *         require_verified_age = true.
 *    - Associate this policy with the created region and policy setting by using
 *         their IDs (region_setting_id and policy_setting_id) as defined in
 *         IShoppingMallAgeRestrictionPolicy.ICreate.
 * 7. Create a review policy via POST /shoppingMall/platformAdmin/reviewPolicies.
 *
 *    - Use a unique reviewPolicyCode and associate it with the region and policy
 *         setting using shopping_mall_region_setting_id and
 *         shopping_mall_policy_setting_id (IDs from the region and policy
 *         setting created earlier).
 *    - Set active=true and provide reasonable windows/thresholds such as
 *         max_days_after_delivery_for_review and allow_edit_within_days.
 * 8. Call DELETE /shoppingMall/platformAdmin/reviewPolicies/{reviewPolicyCode}
 *    using the erase SDK function with the same business code from step 7.
 *
 *    - This must succeed without throwing any error, under the same authenticated
 *         platformAdmin connection.
 *
 * Assertions and validations
 *
 * - For every create operation (join, policy setting, cancellation policy, refund
 *   policy, region setting, age restriction policy, review policy), validate
 *   the response DTOs with typia.assert to guarantee type safety.
 * - Use TestValidator.equals for simple business checks, such as:
 *
 *   - The policy setting output.code equals the input code.
 *   - The region setting output.code equals the region code provided.
 *   - The review policy output.code equals the requested review policy code.
 *   - Active flags are true where configured.
 * - For the DELETE call, only assert that it completes without error; do not
 *   assume a particular HTTP status or response body.
 * - Do not attempt a follow-up GET/read to confirm deletion because such an
 *   endpoint is not part of the provided SDK; the test’s responsibility ends at
 *   confirming that the erase call is authorized and succeeds without
 *   validation/authorization errors.
 */
export async function test_api_platform_admin_delete_review_policy_happy_path(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile (category = "review")
  const policySettingCode = `review_policy_setting_${RandomGenerator.alphaNumeric(8)}`;

  const policySettingBody = {
    code: policySettingCode,
    name: "Review Policy Setting Profile",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  TestValidator.equals(
    "policy setting code must match input",
    policySetting.code,
    policySettingCode,
  );
  TestValidator.predicate(
    "policy setting should be active",
    policySetting.active === true,
  );

  // 3. Create a cancellation policy (not strictly linked, but ensures realistic env)
  const cancellationPolicyCode = `cancel_policy_${RandomGenerator.alphaNumeric(8)}`;

  const cancellationPolicyBody = {
    code: cancellationPolicyCode,
    name: "Default Cancellation Policy",
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
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  TestValidator.equals(
    "cancellation policy code must match input",
    cancellationPolicy.code,
    cancellationPolicyCode,
  );

  // 4. Create a refund policy (active, with simple windows/thresholds)
  const refundPolicyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;

  const refundPolicyBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy",
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
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  TestValidator.equals(
    "refund policy code must match input",
    refundPolicy.code,
    refundPolicyCode,
  );
  TestValidator.predicate(
    "refund policy should be active",
    refundPolicy.isActive === true,
  );

  // 5. Create a region setting (e.g., EU_MARKET)
  const regionCode = `EU_MARKET_${RandomGenerator.alphaNumeric(6)}`;

  const regionBody = {
    code: regionCode,
    name: "European Market",
    iso_country_code: "EU",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  TestValidator.equals("region code must match input", region.code, regionCode);

  // 6. Create an age restriction policy tied to the region and policy setting
  const agePolicyCode = `age_policy_${RandomGenerator.alphaNumeric(8)}`;

  const ageRestrictionBody = {
    code: agePolicyCode,
    name: "Adult Only Policy",
    description: "Age restriction for adult-only catalog",
    minimum_age_years: 18,
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionBody },
    );
  typia.assert(ageRestrictionPolicy);

  TestValidator.equals(
    "age restriction policy code must match input",
    ageRestrictionPolicy.code,
    agePolicyCode,
  );

  // 7. Create a review policy that links to the region and policy setting IDs
  const reviewPolicyCode = `review_policy_${RandomGenerator.alphaNumeric(8)}`;

  const reviewPolicyBody = {
    code: reviewPolicyCode,
    name: "Default Review Policy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    max_days_after_delivery_for_review: 60,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 5,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewPolicyBody },
    );
  typia.assert(reviewPolicy);

  TestValidator.equals(
    "review policy code must match input",
    reviewPolicy.code,
    reviewPolicyCode,
  );
  TestValidator.predicate(
    "review policy should be active",
    reviewPolicy.active === true,
  );

  // 8. Delete the review policy by its business code
  await api.functional.shoppingMall.platformAdmin.reviewPolicies.erase(
    connection,
    {
      reviewPolicyCode,
    },
  );
}
