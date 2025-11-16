import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

/**
 * Validate that a platform administrator can update a review policy to adjust
 * numeric thresholds, activation flags, and effective window while linking it
 * to region and policy setting profiles, preserving identity and lifecycle
 * fields.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) and rely on SDK for Authorization header.
 * 2. As that admin, create a policy setting profile.
 * 3. As the same admin, create a region setting.
 * 4. Create an initial review policy with a known code and baseline values, no
 *    effective window, and no region/policy-setting bindings.
 * 5. Update the review policy by its business code, increasing numeric thresholds,
 *    setting effective_from/effective_to, linking region/policy settings, and
 *    keeping it active.
 * 6. Validate the update response: id/code stability, updated numeric fields,
 *    effective window, linked summaries, audit timestamps, and deleted_at
 *    null.
 */
export async function test_api_review_policy_update_adjust_thresholds_and_effective_window(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin via join
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "203.0.113.10",
    href: "https://admin.shoppingmall.local/onboarding",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile
  const policySettingCode = `review_policy_profile_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Review Moderation Profile",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({
      moderation: {
        profanityFilter: true,
        spamDetection: true,
      },
    }),
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

  // 3. Create a region setting
  const regionCode = `EU_MARKET_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "EU Market",
    iso_country_code: "DE",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionSetting: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(regionSetting);

  // 4. Create baseline review policy with known code
  const reviewPolicyCode = `review_policy_${RandomGenerator.alphaNumeric(8)}`;
  const baselineMaxDays: number & tags.Type<"int32"> = 14 as number &
    tags.Type<"int32">;
  const baselineAllowEditDays: number & tags.Type<"int32"> = 3 as number &
    tags.Type<"int32">;
  const baselineAutoHideThreshold: number & tags.Type<"int32"> = 5 as number &
    tags.Type<"int32">;

  const createReviewPolicyBody = {
    code: reviewPolicyCode,
    name: "Default Review Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: baselineMaxDays,
    allow_edit_within_days: baselineAllowEditDays,
    auto_hide_report_threshold: baselineAutoHideThreshold,
    config_payload: JSON.stringify({ version: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const createdPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: createReviewPolicyBody },
    );
  typia.assert(createdPolicy);

  // Capture original audit fields for later comparison
  const originalId = createdPolicy.id;
  const originalCode = createdPolicy.code;
  const originalCreatedAt = createdPolicy.created_at;
  const originalUpdatedAt = createdPolicy.updated_at;
  const originalDeletedAt = createdPolicy.deleted_at ?? null;

  // 5. Update the review policy by its business code with new thresholds and effective window
  const increasedMaxDays: number & tags.Type<"int32"> = (baselineMaxDays +
    7) as number & tags.Type<"int32">;
  const newAllowEditDays: number & tags.Type<"int32"> = (baselineAllowEditDays +
    2) as number & tags.Type<"int32">;
  const newAutoHideThreshold: number & tags.Type<"int32"> =
    (baselineAutoHideThreshold + 3) as number & tags.Type<"int32">;

  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const effectiveFrom = past.toISOString();
  const effectiveTo = future.toISOString();

  const updateBody = {
    max_days_after_delivery_for_review: increasedMaxDays,
    allow_edit_within_days: newAllowEditDays,
    auto_hide_report_threshold: newAutoHideThreshold,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    active: true,
    shopping_mall_region_setting_id: regionSetting.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.IUpdate;

  const updatedPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.update(
      connection,
      {
        reviewPolicyCode,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 6. Business validations
  // Identity and code must be preserved
  TestValidator.equals(
    "review policy id must remain stable after update",
    updatedPolicy.id,
    originalId,
  );
  TestValidator.equals(
    "review policy code must remain stable after update",
    updatedPolicy.code,
    originalCode,
  );

  // Numeric fields must reflect updated values
  TestValidator.equals(
    "max_days_after_delivery_for_review should be increased",
    updatedPolicy.max_days_after_delivery_for_review,
    increasedMaxDays,
  );
  TestValidator.equals(
    "allow_edit_within_days should be updated",
    updatedPolicy.allow_edit_within_days,
    newAllowEditDays,
  );
  TestValidator.equals(
    "auto_hide_report_threshold should be updated",
    updatedPolicy.auto_hide_report_threshold,
    newAutoHideThreshold,
  );

  // Effective window must be set as requested (compare via predicate to avoid tag type mismatches)
  await TestValidator.predicate(
    "effective_from should match requested past/current timestamp",
    async () => updatedPolicy.effective_from === effectiveFrom,
  );
  await TestValidator.predicate(
    "effective_to should match requested future timestamp",
    async () => updatedPolicy.effective_to === effectiveTo,
  );

  // Active flag remains true
  TestValidator.equals(
    "active flag should remain true after update",
    updatedPolicy.active,
    true,
  );

  // region_setting and policy_setting summaries populated and match ids
  TestValidator.predicate(
    "region_setting summary should be present after linking",
    updatedPolicy.region_setting !== null &&
      updatedPolicy.region_setting !== undefined,
  );
  if (
    updatedPolicy.region_setting !== null &&
    updatedPolicy.region_setting !== undefined
  ) {
    TestValidator.equals(
      "linked region_setting.id should equal created regionSetting.id",
      updatedPolicy.region_setting.id,
      regionSetting.id,
    );
  }

  TestValidator.predicate(
    "policy_setting summary should be present after linking",
    updatedPolicy.policy_setting !== null &&
      updatedPolicy.policy_setting !== undefined,
  );
  if (
    updatedPolicy.policy_setting !== null &&
    updatedPolicy.policy_setting !== undefined
  ) {
    TestValidator.equals(
      "linked policy_setting.id should equal created policySetting.id",
      updatedPolicy.policy_setting.id,
      policySetting.id,
    );
  }

  // Audit timestamps: created_at unchanged, updated_at advanced
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedPolicy.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be later than original updated_at",
    new Date(updatedPolicy.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // deleted_at remains null (or undefined) indicating no soft delete
  const updatedDeletedAt = updatedPolicy.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at should remain null after update",
    updatedDeletedAt,
    originalDeletedAt,
  );
}
