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
 * Ensure duplicate cancellation policy codes are rejected for platform admins.
 *
 * Business purpose: This test verifies that the shopping mall platform enforces
 * a globally unique business `code` for cancellation policies created by
 * platform administrators. It ensures that when an admin attempts to create a
 * second cancellation policy with an already-used `code`, the system rejects
 * the request with a business error instead of silently creating a duplicate or
 * corrupting existing data.
 *
 * High-level steps:
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join.
 *
 *    - This establishes the admin identity and configures the shared connection with
 *         a valid Authorization header (handled by SDK).
 * 2. Create an initial cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies.
 *
 *    - Use a specific `code` string that will be re-used in the duplicate attempt.
 *    - Populate required business fields like name, flags, and activation status,
 *         plus some optional configuration fields.
 * 3. Attempt to create a second cancellation policy with the same `code`.
 *
 *    - Use a different name/description and possibly different flags to ensure the
 *         only duplicate dimension is the `code` field.
 * 4. Assert that:
 *
 *    - The first creation succeeds and returns a valid
 *         IShoppingMallCancellationPolicy response (validated by
 *         typia.assert).
 *    - The second creation call fails and throws an error, captured using
 *         TestValidator.error with an async callback.
 *
 * Limitations:
 *
 * - No listing or retrieval endpoint is available in this context, so the test
 *   cannot explicitly count how many policies exist with that code. Instead, it
 *   relies on the failure of the second creation attempt as evidence that
 *   uniqueness constraints are enforced.
 */
export async function test_api_cancellation_policy_creation_with_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Join as platform admin so that subsequent calls run with admin auth.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create the initial cancellation policy with a specific, reusable code.
  const duplicatedCode: string = RandomGenerator.alphaNumeric(16);

  const firstPolicyBody = {
    code: duplicatedCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: typia.random<number & tags.Type<"int32">>(),
    config_payload: null,
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const firstPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: firstPolicyBody,
      },
    );
  typia.assert(firstPolicy);

  TestValidator.equals(
    "first policy code should match requested code",
    firstPolicy.code,
    duplicatedCode,
  );

  // 3. Attempt to create a second policy with the same `code` but different
  //    other attributes, expecting a business error.
  const secondPolicyBody = {
    code: duplicatedCode, // same code to trigger unique index violation
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: false,
    allow_partial_cancellation: false,
    max_hours_after_payment: typia.random<number & tags.Type<"int32">>(),
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  await TestValidator.error(
    "duplicate cancellation policy code should be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
        connection,
        {
          body: secondPolicyBody,
        },
      );
    },
  );
}
