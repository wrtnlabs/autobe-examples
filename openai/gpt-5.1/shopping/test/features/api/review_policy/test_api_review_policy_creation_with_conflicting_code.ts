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
 * Validate that creating a review policy enforces unique `code` values.
 *
 * Business goal: Ensure that `shopping_mall_review_policies.code` behaves as a
 * unique business identifier when platform administrators create policies. The
 * system must accept the first creation with a given code and reject any
 * subsequent creation attempts that reuse the same `code`, thereby preventing
 * duplicate configuration rows that could confuse downstream review flows.
 *
 * Flow under test:
 *
 * 1. Register and authenticate a platform admin using POST
 *    /auth/platformAdmin/join. The SDK automatically stores the issued access
 *    token into the connection, so subsequent admin-only calls operate under
 *    this identity.
 * 2. As this platform admin, create an initial review policy using POST
 *    /shoppingMall/platformAdmin/reviewPolicies with a concrete and memorable
 *    code (for example, `"default_review"`). Provide a realistic set of
 *    configuration values via IShoppingMallReviewPolicy.ICreate, including
 *    activation flag and temporal window fields.
 * 3. Immediately attempt to create a second review policy using the same `code`
 *    but with different human-readable values (name, description, thresholds,
 *    etc.). Because the schema enforces a unique index on `code`, this call
 *    must fail with some HTTP error status.
 * 4. Use TestValidator.error to assert that the second creation attempt throws,
 *    without coupling the test to specific HTTP status codes or error body
 *    structures.
 * 5. Validate that the first response is a well-formed IShoppingMallReviewPolicy
 *    and that its persisted fields match the request body used in the original
 *    creation call, confirming that the successful policy is stable and that
 *    the failed second call did not silently mutate or replace it.
 *
 * Limitations and scope:
 *
 * - The available SDK only exposes POST
 *   /shoppingMall/platformAdmin/reviewPolicies (create); there is no GET or
 *   list endpoint to re-fetch the policy by code. Therefore, the test validates
 *   uniqueness indirectly by asserting that the first creation succeeds and the
 *   second fails, and by checking that the first response echoes the initially
 *   supplied configuration.
 * - The test does not inspect HTTP status codes or error payloads; it only
 *   confirms that an error is raised for the conflicting creation attempt.
 */
export async function test_api_review_policy_creation_with_conflicting_code(
  connection: api.IConnection,
) {
  // 1. Join and authenticate a platform admin so we can call admin-only APIs.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create the first review policy with a unique code.
  const policyCode = "default_review";

  const firstCreateBody = {
    code: policyCode,
    name: "Default Review Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 5,
    config_payload: JSON.stringify({ allowAnonymous: false, minRating: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const firstPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: firstCreateBody },
    );
  typia.assert<IShoppingMallReviewPolicy>(firstPolicy);

  // Validate that the created policy matches the requested configuration.
  TestValidator.equals(
    "created review policy code matches request",
    firstPolicy.code,
    firstCreateBody.code,
  );
  TestValidator.equals(
    "created review policy name matches request",
    firstPolicy.name,
    firstCreateBody.name,
  );
  TestValidator.equals(
    "created review policy description matches request",
    firstPolicy.description ?? null,
    firstCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created review policy max_days_after_delivery_for_review matches request",
    firstPolicy.max_days_after_delivery_for_review ?? null,
    firstCreateBody.max_days_after_delivery_for_review ?? null,
  );
  TestValidator.equals(
    "created review policy allow_edit_within_days matches request",
    firstPolicy.allow_edit_within_days ?? null,
    firstCreateBody.allow_edit_within_days ?? null,
  );
  TestValidator.equals(
    "created review policy auto_hide_report_threshold matches request",
    firstPolicy.auto_hide_report_threshold ?? null,
    firstCreateBody.auto_hide_report_threshold ?? null,
  );
  TestValidator.equals(
    "created review policy config_payload matches request",
    firstPolicy.config_payload ?? null,
    firstCreateBody.config_payload ?? null,
  );
  TestValidator.equals(
    "created review policy active flag matches request",
    firstPolicy.active,
    firstCreateBody.active,
  );
  TestValidator.equals(
    "created review policy effective_from matches request",
    firstPolicy.effective_from ?? null,
    firstCreateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "created review policy effective_to matches request",
    firstPolicy.effective_to ?? null,
    firstCreateBody.effective_to ?? null,
  );

  // 3. Attempt to create a second review policy with the same code but
  //    different configuration values. This must fail due to unique index
  //    constraint on `code`.
  const secondCreateBody = {
    code: policyCode, // same code to trigger conflict
    name: "Conflicting Review Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    max_days_after_delivery_for_review: 14,
    allow_edit_within_days: 3,
    auto_hide_report_threshold: 2,
    config_payload: JSON.stringify({ allowAnonymous: true, minRating: 2 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  await TestValidator.error(
    "creating a second review policy with duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
        connection,
        { body: secondCreateBody },
      );
    },
  );
}
