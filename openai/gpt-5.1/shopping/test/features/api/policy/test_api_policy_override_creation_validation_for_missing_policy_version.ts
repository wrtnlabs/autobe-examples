import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate that policy override creation rejects non-existent policy versions.
 *
 * ## Business goal
 *
 * Ensure the governance layer prevents creation of policy overrides that
 * reference a policy version id that does not exist in
 * `shopping_mall_policy_versions`. This protects referential integrity and
 * avoids overrides that cannot be evaluated at runtime because their base
 * policy version is missing.
 *
 * ## High level flow (adapted to available APIs and e2e rules)
 *
 * 1. Admin registration & authentication
 *
 *    - Call POST /auth/admin/join using a random but valid
 *         `IShoppingMallAdminJoin.ICreate` payload.
 *    - The SDK automatically attaches the admin access token to the `connection`, so
 *         subsequent admin APIs can be invoked.
 *    - Assert the returned `IShoppingMallAdmin.IAuthorized` payload shape with
 *         `typia.assert`.
 * 2. Optional: create a legitimate business policy
 *
 *    - Call POST /shoppingMall/admin/businessPolicies with a valid
 *         `IShoppingMallBusinessPolicy.ICreate` payload to simulate a realistic
 *         environment where policies exist.
 *    - This step is not strictly required to trigger the invalid foreign key
 *         behavior, but it better matches production usage where overrides are
 *         defined against real policies.
 *    - Assert the returned `IShoppingMallBusinessPolicy` payload with
 *         `typia.assert`.
 * 3. Prepare an override creation body with invalid policy_version_id
 *
 *    - Generate a random UUID value to use as `shopping_mall_policy_version_id`. Do
 *         not create any policy version via API (no such endpoint is
 *         available), so this id is guaranteed to be unknown to the system.
 *    - Populate the rest of `IShoppingMallPolicyOverride.ICreate` with valid,
 *         realistic data:
 *
 *         - Subject_type: some domain string like "seller" or "global".
 *         - Subject_id: either a random UUID or null depending on subject_type.
 *         - Subject_display: a short descriptive string (e.g., seller name).
 *         - Override_code: a business-style key such as "refund_window_days" or
 *                   "commission_rate".
 *         - Override_value: a text value compatible with that code, for example "14" for
 *                   days or "0.15" for 15%.
 *         - Reason: a longer free-form explanation created via
 *                   `RandomGenerator.paragraph`.
 *         - Status: set to a plausible state like "active" or "pending".
 *         - Effective_from / effective_until: optional ISO date-time strings using `new
 *                   Date().toISOString()` for from and a future time for
 *                   until.
 * 4. Attempt override creation and assert failure
 *
 *    - Call POST /shoppingMall/admin/policyOverrides via
 *         `api.functional.shoppingMall.admin.policyOverrides.create`, passing
 *         the invalid `shopping_mall_policy_version_id` body.
 *    - Wrap the call in `TestValidator.error` with a descriptive title like "policy
 *         override creation must fail for unknown policy_version_id".
 *    - Because the SDK surfaces HTTP failures as exceptions, the expectation is
 *         simply that the call throws; do not:
 *
 *         - Assert on the exact HTTP status code,
 *         - Attempt to parse or validate error payload shapes, or
 *         - Attempt any follow-up list/read calls for overrides (no such endpoints are
 *                   available).
 * 5. Positive sanity check around valid data paths
 *
 *    - As a complement (but not required for the core FK validation), we can ensure
 *         that the prepared override body is structurally valid by doing
 *         `typia.assert<IShoppingMallPolicyOverride.ICreate>(body)` before the
 *         failing call. This guards against accidental type misconfiguration in
 *         the test itself and guarantees that the failure truly originates from
 *         the foreign key constraint rather than DTO shape issues.
 *
 * ## Constraints & notes
 *
 * - Do not manipulate `connection.headers` directly; admin authentication is
 *   handled via the SDK join call.
 * - Do not test invalid TypeScript-level data such as wrong property types or
 *   missing required fields; the test must focus purely on business logic
 *   (non-existent FK) and use fully type-safe request bodies.
 * - Do not assert specific HTTP status codes or error payload formats; just
 *   assert that an error is thrown when the invalid FK is used.
 */
export async function test_api_policy_override_creation_validation_for_missing_policy_version(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Optional: create a legitimate business policy
  const businessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: {
          policy_code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          category: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          is_active: true,
        } satisfies IShoppingMallBusinessPolicy.ICreate,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  // 3. Prepare override body with non-existent policy version id
  const missingPolicyVersionId = typia.random<string & tags.Format<"uuid">>();

  const overrideBody = {
    shopping_mall_policy_version_id: missingPolicyVersionId,
    subject_type: "seller",
    subject_id: typia.random<string & tags.Format<"uuid">>(),
    subject_display: RandomGenerator.name(2),
    override_code: "refund_window_days",
    override_value: "14",
    reason: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IShoppingMallPolicyOverride.ICreate;

  // 5. Sanity check that overrideBody structurally matches the DTO
  typia.assert<IShoppingMallPolicyOverride.ICreate>(overrideBody);

  // 4. Attempt override creation and assert failure due to missing policy version
  await TestValidator.error(
    "policy override creation must fail for unknown policy_version_id",
    async () => {
      await api.functional.shoppingMall.admin.policyOverrides.create(
        connection,
        {
          body: overrideBody,
        },
      );
    },
  );
}
