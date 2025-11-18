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
 * Delete an active policy override created for a specific business policy
 * version.
 *
 * Business context: This test simulates an admin lifecycle where a new business
 * policy is registered, an active version of that policy is created, and then
 * an active policy override is established for a concrete subject (for example,
 * a particular seller) that adjusts some aspect of the policy. Once the
 * override is no longer needed, the admin deletes it.
 *
 * The purpose of this test is to ensure that:
 *
 * 1. An admin account can be joined and authenticated.
 * 2. A business policy can be created in an active state.
 * 3. An active policy version can be created under that policy.
 * 4. An active policy override can be created for that version and a seller
 *    subject.
 * 5. The override can be deleted successfully via the DELETE
 *    /shoppingMall/admin/policyOverrides/{policyOverrideId} endpoint without
 *    throwing any error.
 *
 * Due to the available SDK functions, this test focuses on the successful
 * deletion call itself rather than re-fetching the override afterwards.
 * Successful completion of the erase call is treated as evidence that the
 * override record has been removed from active governance decisions in the
 * backend.
 */
export async function test_api_policy_override_delete_active_override(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a business policy in active state
  const policyCode: string = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;
  const businessPolicyBody = {
    policy_code: policyCode,
    name: RandomGenerator.name(3),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: businessPolicyBody },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  // 3. Create an active policy version for that policy
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const policyVersionBody = {
    version_code: `v_${RandomGenerator.alphaNumeric(4)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: "{}",
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policyCode,
        body: policyVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // 4. Create an active policy override targeting a seller subject
  const policyOverrideBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "seller",
    subject_id: typia.random<string & tags.Format<"uuid">>(),
    subject_display: RandomGenerator.name(2),
    override_code: "refund_window_days",
    override_value: "30",
    reason: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const policyOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: policyOverrideBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(policyOverride);

  // 5. Delete the policy override by its ID
  await api.functional.shoppingMall.admin.policyOverrides.erase(connection, {
    policyOverrideId: policyOverride.id,
  });

  // 6. Minimal behavioral assertion: we reached this point without error.
  TestValidator.predicate(
    "policy override deletion completed without throwing an error",
    true,
  );
}
