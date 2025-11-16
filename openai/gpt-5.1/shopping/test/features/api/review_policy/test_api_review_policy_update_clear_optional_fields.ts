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
 * Verify that a platform administrator can clear nullable configuration fields
 * on an existing review policy using the update endpoint.
 *
 * Business steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated admin session.
 * 2. Create an initial review policy via POST
 *    /shoppingMall/platformAdmin/reviewPolicies with:
 *
 *    - A unique business `code` and `name`.
 *    - All nullable numeric fields populated with non-null int32 values:
 *         `max_days_after_delivery_for_review`, `allow_edit_within_days`,
 *         `auto_hide_report_threshold`.
 *    - `config_payload` set to a non-null JSON string.
 *    - `active` set to true.
 *    - `effective_from` and `effective_to` populated with valid ISO date-time
 *         strings.
 * 3. Call PUT /shoppingMall/platformAdmin/reviewPolicies/{reviewPolicyCode}
 *    (api.functional.shoppingMall.platformAdmin.reviewPolicies.update) using
 *    the created policy's `code` and an IShoppingMallReviewPolicy.IUpdate
 *    payload that explicitly sets the nullable optionals to null:
 *
 *    - `max_days_after_delivery_for_review: null`.
 *    - `allow_edit_within_days: null`.
 *    - `auto_hide_report_threshold: null`.
 *    - `config_payload: null`.
 *    - `effective_from: null`.
 *    - `effective_to: null`. Other fields like `name`, `description`, `active`,
 *         `shopping_mall_region_setting_id`, and
 *         `shopping_mall_policy_setting_id` are omitted so they remain
 *         unchanged.
 * 4. Verify on the response IShoppingMallReviewPolicy that:
 *
 *    - `id` and `code` are unchanged from the original policy.
 *    - `created_at` is unchanged.
 *    - `active` is still true.
 *    - `updated_at` has changed from its original value.
 *    - All targeted nullable fields are now null.
 *    - `region_setting` and `policy_setting` remain null (no unintended association
 *         changes).
 */
export async function test_api_review_policy_update_clear_optional_fields(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized admin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // ip is optional (string | null | undefined) - keep it undefined to avoid noise.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial, fully-configured review policy.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const effectiveFrom = new Date(now.getTime()).toISOString();
  const effectiveTo = new Date(now.getTime() + thirtyDaysMs).toISOString();

  const createBody = {
    code: `review_policy_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: typia.random<
      number & tags.Type<"int32">
    >(),
    allow_edit_within_days: typia.random<number & tags.Type<"int32">>(),
    auto_hide_report_threshold: typia.random<number & tags.Type<"int32">>(),
    config_payload: JSON.stringify({ allowImages: true, minRating: 1 }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    // Keep region/policy fk null to simplify expectations.
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const created: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Preserve invariants for later comparison.
  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalActive = created.active;

  // Sanity checks on initial state.
  TestValidator.predicate(
    "created review policy is active",
    () => originalActive === true,
  );

  // 3. Update the policy, explicitly clearing selected nullable fields with nulls.
  const updateBody = {
    max_days_after_delivery_for_review: null,
    allow_edit_within_days: null,
    auto_hide_report_threshold: null,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    // Omit name, description, active and FK fields so they are left unchanged.
  } satisfies IShoppingMallReviewPolicy.IUpdate;

  const updated: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.update(
      connection,
      {
        reviewPolicyCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business assertions on the updated policy.
  TestValidator.equals(
    "policy id remains unchanged after update",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "policy code remains unchanged after update",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "active flag remains true after clearing optional fields",
    updated.active,
    originalActive,
  );

  TestValidator.predicate(
    "updated_at is changed after update",
    () => updated.updated_at !== originalUpdatedAt,
  );

  TestValidator.equals(
    "max_days_after_delivery_for_review has been cleared to null",
    updated.max_days_after_delivery_for_review,
    null,
  );
  TestValidator.equals(
    "allow_edit_within_days has been cleared to null",
    updated.allow_edit_within_days,
    null,
  );
  TestValidator.equals(
    "auto_hide_report_threshold has been cleared to null",
    updated.auto_hide_report_threshold,
    null,
  );
  TestValidator.equals(
    "config_payload has been cleared to null",
    updated.config_payload,
    null,
  );
  TestValidator.equals(
    "effective_from has been cleared to null",
    updated.effective_from,
    null,
  );
  TestValidator.equals(
    "effective_to has been cleared to null",
    updated.effective_to,
    null,
  );

  // 6. Region/policy summaries should remain null as we never set FKs.
  TestValidator.equals(
    "region_setting summary remains null after update",
    updated.region_setting,
    null,
  );
  TestValidator.equals(
    "policy_setting summary remains null after update",
    updated.policy_setting,
    null,
  );
}
