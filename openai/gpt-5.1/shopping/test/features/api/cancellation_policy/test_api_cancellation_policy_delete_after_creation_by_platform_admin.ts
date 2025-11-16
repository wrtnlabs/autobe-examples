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
 * Validate that a platform administrator can delete a cancellation policy right
 * after creating it, using its business code.
 *
 * Business context
 *
 * - Cancellation policies are high-level configuration objects that control how
 *   order cancellations work across the shopping mall.
 * - Only platform administrators are allowed to manage these policies.
 * - Policies are addressed by a human-readable `code` string that is globally
 *   unique and used as the path parameter for deletion.
 *
 * Test workflow
 *
 * 1. Join a new platform administrator using POST /auth/platformAdmin/join. This
 *    not only creates the admin identity and credentials, but also issues JWT
 *    tokens and stores the access token into the connection headers for
 *    subsequent authenticated calls.
 * 2. Using the authenticated admin connection, create a fresh cancellation policy
 *    via POST /shoppingMall/platformAdmin/cancellationPolicies with:
 *
 *    - `code`: a unique, random string so there is no uniqueness conflict
 *    - `name`: a realistic display name derived from RandomGenerator
 *    - `description`: optional, random paragraph text
 *    - `allow_cancellation_before_shipment`: boolean flag (e.g. true)
 *    - `allow_partial_cancellation`: boolean flag (e.g. true)
 *    - `max_hours_after_payment`: optional integer hours window, or null
 *    - `config_payload`: optional string or null; can be left null
 *    - `effective_from` / `effective_to`: left null to simplify the test
 *    - `active`: true to represent a currently active policy
 *    - `region_code` / `policy_setting_code`: left null to avoid needing
 *         pre-existing region/policy setting records Capture the returned
 *         IShoppingMallCancellationPolicy and assert its structure using
 *         typia.assert().
 * 3. Call DELETE
 *    /shoppingMall/platformAdmin/cancellationPolicies/{cancellationPolicyCode}
 *    by invoking
 *    api.functional.shoppingMall.platformAdmin.cancellationPolicies.erase with
 *    `cancellationPolicyCode` equal to the created policy's `code`.
 * 4. Assert that the delete operation completes without throwing any error. Since
 *    erase() returns void and no read API is provided in the materials, we
 *    treat successful completion as evidence that the policy was accepted for
 *    deletion and that the admin was properly authorized.
 *
 * Validation focus
 *
 * - The admin join flow must succeed and yield an authorized admin session.
 * - The cancellation policy creation must succeed with the given payload and
 *   return a fully-typed IShoppingMallCancellationPolicy instance.
 * - The erase operation must accept the `code` from the created policy and finish
 *   without error, demonstrating that a freshly created policy can be removed
 *   by the same platform admin.
 */
export async function test_api_cancellation_policy_delete_after_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Sanity check on token structure
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a new cancellation policy with a unique business code
  const cancellationPolicyBody = {
    code: `TEST-CANCEL-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const createdPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationPolicyBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(createdPolicy);

  // Ensure the created policy echoes the requested code and is marked active
  TestValidator.equals(
    "created policy code should match request code",
    createdPolicy.code,
    cancellationPolicyBody.code,
  );
  TestValidator.predicate(
    "created policy should be active",
    createdPolicy.active === true,
  );

  // 3. Delete the newly created cancellation policy by its business code
  await api.functional.shoppingMall.platformAdmin.cancellationPolicies.erase(
    connection,
    {
      cancellationPolicyCode: createdPolicy.code,
    },
  );

  // 4. If we reach this point without an exception, deletion is considered successful
  TestValidator.predicate("erase should complete without throwing", true);
}
