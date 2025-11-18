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
 * Delete a policy override linked to an effectively retired policy version.
 *
 * ## Business purpose
 *
 * This test exercises the governance flow where an administrator cleans up a
 * policy override whose underlying business policy version is no longer
 * applicable for new decisions (for example, status already marked as "retired"
 * or its effective_until is in the past), but the override row still exists in
 * the database. The platform must allow deletion of such overrides so that
 * obsolete exceptions do not accumulate indefinitely.
 *
 * ## What this test validates
 *
 * 1. An admin can join and obtain authorization via POST /auth/admin/join.
 * 2. The admin can create a business policy via POST
 *    /shoppingMall/admin/businessPolicies.
 * 3. The admin can create a concrete policy version for that policy via POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions, already
 *    configured as logically retired/expired using its status and
 *    effective_until fields.
 * 4. The admin can still create a policy override that references this
 *    retired/expired policy version via POST
 *    /shoppingMall/admin/policyOverrides.
 * 5. The admin can delete the override via DELETE
 *    /shoppingMall/admin/policyOverrides/{policyOverrideId} even though its
 *    parent policy version is not active.
 * 6. A subsequent deletion attempt on the same override id fails, implying that
 *    the first deletion actually removed the record.
 *
 * Due to available SDK limitations, we cannot re-fetch the override via GET or
 * list/search endpoints; instead, we infer successful deletion from the
 * combination of a successful first DELETE and a failing second DELETE.
 */
export async function test_api_policy_override_delete_after_policy_retirement(
  connection: api.IConnection,
) {
  // 1. Admin join: obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    // optional ip and referrer
    ip: null,
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a base business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;

  const createPolicyBody = {
    policy_code: policyCode,
    name: "Refund Policy for Legacy Campaign",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: false, // already logically retired at the policy level
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  TestValidator.equals(
    "created policy uses requested policy_code",
    businessPolicy.policy_code,
    policyCode,
  );

  // 3. Create a retired/expired policy version for that policy
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

  const versionCode = `v_${RandomGenerator.alphaNumeric(6)}`;

  const createVersionBody = {
    version_code: versionCode,
    title: "Legacy Refund Policy Version",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "retired", // logically retired
    effective_from: past.toISOString(),
    effective_until: past.toISOString(), // window entirely in the past
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: createVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  TestValidator.equals(
    "created policy version uses requested version_code",
    policyVersion.version_code,
    versionCode,
  );

  // 4. Create a policy override referencing the retired version
  const subjectId = typia.random<string & tags.Format<"uuid">>();

  const createOverrideBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "seller",
    subject_id: subjectId,
    subject_display: RandomGenerator.name(2),
    override_code: "max_refund_window_days",
    override_value: "45",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    effective_from: past.toISOString(),
    effective_until: past.toISOString(), // also fully in the past
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const override: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: createOverrideBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(override);

  TestValidator.equals(
    "override references expected policy version id",
    override.shopping_mall_policy_version_id,
    policyVersion.id,
  );

  // 5. Delete the override even though its policy/version are effectively retired
  await api.functional.shoppingMall.admin.policyOverrides.erase(connection, {
    policyOverrideId: override.id,
  });

  // If we reach here without throwing, the deletion itself succeeded.
  TestValidator.predicate(
    "delete on policy override tied to retired policy/version succeeds",
    true,
  );

  // 6. Second delete attempt should fail, implying the first delete removed it
  await TestValidator.error(
    "second delete on already-deleted policy override should fail",
    async () => {
      await api.functional.shoppingMall.admin.policyOverrides.erase(
        connection,
        {
          policyOverrideId: override.id,
        },
      );
    },
  );
}
