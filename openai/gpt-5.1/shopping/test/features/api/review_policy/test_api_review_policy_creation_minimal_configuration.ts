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
 * Validate minimal-configuration creation of a review policy by a platform
 * admin.
 *
 * Business goal
 *
 * - Ensure that a platform administrator can create a review policy using the
 *   minimal required configuration:
 *
 *   - Required business identity fields (code, name, active) are provided.
 *   - All other configuration knobs are intentionally null.
 * - Confirm that the backend persists a valid, active policy record, with
 *   timestamps and optional relations in a consistent null/undefined state.
 *
 * Steps
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to get a
 *         structurally valid payload, but override email, href, and referrer
 *         with clearly valid values to make the scenario more readable.
 *    - The SDK join() call will automatically inject the issued access token into
 *         connection.headers.Authorization.
 * 2. As this platform admin, call
 *    api.functional.shoppingMall.platformAdmin.reviewPolicies.create with a
 *    minimal IShoppingMallReviewPolicy.ICreate body that:
 *
 *    - Supplies a unique code and non-empty name.
 *    - Sets active = true.
 *    - Explicitly sets the numeric configuration fields
 *         max_days_after_delivery_for_review, allow_edit_within_days, and
 *         auto_hide_report_threshold to null.
 *    - Explicitly sets config_payload, effective_from, effective_to,
 *         shopping_mall_region_setting_id, and shopping_mall_policy_setting_id
 *         to null.
 * 3. Validate that the response is a well-formed IShoppingMallReviewPolicy:
 *
 *    - Use typia.assert() on the response.
 *    - Assert with TestValidator that:
 *
 *         - Code and name match the request.
 *         - Active is true.
 *         - Max_days_after_delivery_for_review, allow_edit_within_days,
 *                   auto_hide_report_threshold, and config_payload are all
 *                   null.
 *         - Effective_from and effective_to are null.
 *         - Region_setting and policy_setting relations are null because we passed null
 *                   for their foreign keys.
 *         - Deleted_at is null (not soft-deleted at creation).
 *         - Created_at and updated_at are non-empty strings (trusting typia.assert for
 *                   date-time validation itself).
 */
export async function test_api_review_policy_creation_minimal_configuration(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authorized connection
  const joinRequest = {
    ...typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Prepare minimal IShoppingMallReviewPolicy.ICreate payload
  const code = `policy_${RandomGenerator.alphaNumeric(12)}`;
  const name = RandomGenerator.paragraph({ sentences: 2 });

  const createBody = {
    code,
    name,
    description: null,
    max_days_after_delivery_for_review: null,
    allow_edit_within_days: null,
    auto_hide_report_threshold: null,
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const policy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert(policy);

  // 3. Business assertions on the persisted policy
  TestValidator.equals("policy code should match input", policy.code, code);
  TestValidator.equals("policy name should match input", policy.name, name);
  TestValidator.predicate("policy should be active", policy.active === true);

  TestValidator.equals(
    "max_days_after_delivery_for_review is null",
    policy.max_days_after_delivery_for_review ?? null,
    null,
  );
  TestValidator.equals(
    "allow_edit_within_days is null",
    policy.allow_edit_within_days ?? null,
    null,
  );
  TestValidator.equals(
    "auto_hide_report_threshold is null",
    policy.auto_hide_report_threshold ?? null,
    null,
  );
  TestValidator.equals(
    "config_payload is null",
    policy.config_payload ?? null,
    null,
  );
  TestValidator.equals(
    "effective_from is null",
    policy.effective_from ?? null,
    null,
  );
  TestValidator.equals(
    "effective_to is null",
    policy.effective_to ?? null,
    null,
  );

  TestValidator.equals(
    "region_setting relation should be null",
    policy.region_setting ?? null,
    null,
  );
  TestValidator.equals(
    "policy_setting relation should be null",
    policy.policy_setting ?? null,
    null,
  );

  TestValidator.equals(
    "deleted_at should be null on creation",
    policy.deleted_at ?? null,
    null,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof policy.created_at === "string" && policy.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof policy.updated_at === "string" && policy.updated_at.length > 0,
  );

  TestValidator.predicate(
    "policy id should be a non-empty string",
    typeof policy.id === "string" && policy.id.length > 0,
  );
}
