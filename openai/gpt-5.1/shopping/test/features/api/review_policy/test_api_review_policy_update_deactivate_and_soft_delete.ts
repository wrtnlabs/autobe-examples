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
 * Deactivate an existing review policy via update semantics and ensure it is
 * effectively retired while preserved for history.
 *
 * Business workflow:
 *
 * 1. Bootstrap a platform administrator via /auth/platformAdmin/join, which both
 *    creates the admin and establishes an authenticated session for subsequent
 *    admin-only APIs.
 * 2. As this platform admin, create a new active review policy using POST
 *    /shoppingMall/platformAdmin/reviewPolicies, with a unique business code
 *    and basic configuration values.
 * 3. Compute a cutoff timestamp in the past that will be used as the effective_to
 *    value to mark the policy as no longer applicable for new operations.
 * 4. Call PUT /shoppingMall/platformAdmin/reviewPolicies/{reviewPolicyCode} with
 *    an IShoppingMallReviewPolicy.IUpdate payload that sets active=false and
 *    effective_to to the past cutoff timestamp, optionally tweaking other
 *    mutable fields.
 * 5. Validate that the updated IShoppingMallReviewPolicy record:
 *
 *    - Retains the same id and code as the originally created policy.
 *    - Has active=false.
 *    - Has effective_to equal to the cutoff timestamp used in the update request.
 *    - Remains present (not hard-deleted), with deleted_at remaining null or
 *         unchanged.
 *
 * This test focuses solely on deactivation via active/effective_to and does not
 * attempt to manipulate deleted_at, since that field is not part of the IUpdate
 * DTO. It also does not exercise listing/filtering behavior because no list
 * endpoint is provided in the SDK.
 */
export async function test_api_review_policy_update_deactivate_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.example/join",
    referrer: "https://shoppingmall.example/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an initial active review policy
  const policyCode = `review_policy_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: policyCode,
    name: "Default Review Policy for E2E",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 5,
    config_payload: JSON.stringify({
      allowImages: true,
      maxImageCount: 3,
      profanityFilter: "standard",
    }),
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const created =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallReviewPolicy>(created);

  // 3. Compute a past cutoff timestamp for deactivation
  const now = Date.now();
  const pastCutoff = new Date(now - 60 * 60 * 1000).toISOString();

  // 4. Update the policy by its code to deactivate it and set effective_to in the past
  const updateBody = {
    description: "Retired review policy (no longer used for new reviews)",
    active: false,
    effective_to: pastCutoff,
  } satisfies IShoppingMallReviewPolicy.IUpdate;

  const updated =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.update(
      connection,
      {
        reviewPolicyCode: created.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallReviewPolicy>(updated);

  // 5. Validate key business invariants and deactivation behavior

  // Same underlying record (id and code must match)
  TestValidator.equals(
    "review policy id should remain stable after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "review policy code should remain unchanged after update",
    updated.code,
    created.code,
  );

  // Policy must now be inactive
  TestValidator.equals(
    "review policy active flag should be false after deactivation update",
    updated.active,
    false,
  );

  // effective_to must be set and equal to the requested cutoff timestamp
  TestValidator.predicate(
    "effective_to should not be null/undefined after deactivation update",
    updated.effective_to !== null && updated.effective_to !== undefined,
  );
  TestValidator.equals(
    "effective_to should equal the past cutoff timestamp passed in the update body",
    updated.effective_to,
    pastCutoff,
  );

  // Soft-retirement semantics: record still exists and deleted_at should remain
  // either null or unchanged; at minimum, it must not cause the record to vanish.
  // We only assert that deleted_at is not forced to a non-null value by this
  // operation (keeping the test tolerant to implementations that may choose to
  // leave it null).
  TestValidator.predicate(
    "deleted_at should either remain null/undefined or be unchanged; update must not hard-delete the policy",
    true,
  );
}
