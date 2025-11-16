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
 * Verify that platform-admin review policy detail lookup returns not-found when
 * given an unknown business code, while still succeeding for a known-existing
 * policy.
 *
 * Business intent:
 *
 * - Platform admins look up review policies by business-facing `code`.
 * - The detail endpoint must behave safely when a code does not exist: it should
 *   surface a not-found style error instead of returning a random record or
 *   leaking internal details.
 *
 * Test steps:
 *
 * 1. Bootstrap a platform admin session via /auth/platformAdmin/join so that
 *    subsequent calls run with proper authorization.
 * 2. Create one valid review policy via POST
 *    /shoppingMall/platformAdmin/reviewPolicies using a random, unique `code`
 *    field to avoid collisions.
 * 3. Confirm the created policy can be loaded back via the `code` using
 *    api.functional.shoppingMall.platformAdmin.reviewPolicies.at and
 *    typia.assert on the response.
 * 4. Derive an unknown reviewPolicyCode that cannot collide with the existing one
 *    (for example, append a non-overlapping random suffix such as "-unknown"
 *    plus RandomGenerator.alphaNumeric(8)).
 * 5. Call the same `at` endpoint with this unknown code and assert that it fails
 *    with an HTTP 404 (or equivalent not-found) using TestValidator.httpError.
 *    Do not inspect the response body; only the fact that it is an HTTP error
 *    with not-found semantics matters.
 *
 * Notes and constraints:
 *
 * - Authentication token management is handled automatically by the join
 *   endpoint, so the test should not manipulate connection headers directly.
 * - Do not attempt to simulate type errors; send only validly-typed payloads for
 *   join and create operations.
 */
export async function test_api_platform_admin_review_policy_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a valid review policy with a unique business code
  const baseCode = `policy_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: baseCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: typia.random<
      number & tags.Type<"int32">
    >(),
    allow_edit_within_days: typia.random<number & tags.Type<"int32">>(),
    auto_hide_report_threshold: typia.random<number & tags.Type<"int32">>(),
    config_payload: RandomGenerator.paragraph({ sentences: 10 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const created: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "created review policy code matches request",
    created.code,
    createBody.code,
  );

  // 3. Ensure the created policy is retrievable by its code
  const found: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.at(
      connection,
      { reviewPolicyCode: created.code },
    );
  typia.assert(found);
  TestValidator.equals(
    "found review policy id matches created",
    found.id,
    created.id,
  );

  // 4. Build an unknown code that cannot collide with the existing one
  const unknownCode = `${created.code}-unknown-${RandomGenerator.alphaNumeric(8)}`;

  // 5. Calling detail with the unknown code must result in a not-found HTTP error
  await TestValidator.httpError(
    "unknown review policy code should yield http 404-style error",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.reviewPolicies.at(
        connection,
        { reviewPolicyCode: unknownCode },
      );
    },
  );
}
