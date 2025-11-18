import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate guarded deletion of a business policy when active versions exist,
 * and successful deletion after retiring versions.
 *
 * Business intent:
 *
 * - A business policy (e.g., refund_standard) can have multiple concrete versions
 *   stored in shopping_mall_policy_versions.
 * - Domain rules should prevent deleting a policy while any version is still
 *   active/effective, to avoid orphaned or ambiguous runtime behavior.
 * - Once all versions are retired/inactive, deletion may proceed.
 *
 * Test steps:
 *
 * 1. Join as an admin to obtain an authenticated admin context.
 * 2. Create a new business policy with a unique policy_code.
 * 3. Create an "active" policy version underneath that policy.
 * 4. Attempt to delete the policy and assert that the operation fails
 *    (business-rule guard due to active versions).
 * 5. Verify via GET that the policy still exists after the failed deletion.
 * 6. Update the version to a non-active status (e.g., "retired").
 * 7. Retry deletion and assert that deletion now succeeds.
 * 8. Verify via GET that the policy is now gone (GET should fail).
 */
export async function test_api_business_policy_delete_with_active_versions_guarded(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;
  const createPolicyBody = {
    policy_code: policyCode,
    name: `Refund Policy ${RandomGenerator.name(2)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 3. Create an "active" policy version under this policy
  const versionCode = `v_${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const createVersionBody = {
    version_code: versionCode,
    title: `Initial version for ${policy.policy_code}`,
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ maxRefundDays: 14 }),
    status: "active",
    effective_from: effectiveFrom as string & tags.Format<"date-time">,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const activeVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: createVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(activeVersion);

  // 4. Attempt to delete the business policy while active version exists
  await TestValidator.error(
    "cannot delete policy with active versions",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.erase(
        connection,
        {
          policyCode: policy.policy_code,
        },
      );
    },
  );

  // 5. Ensure the policy still exists after failed deletion
  const stillExisting =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: policy.policy_code,
    });
  typia.assert<IShoppingMallBusinessPolicy>(stillExisting);
  TestValidator.equals(
    "policy_code remains unchanged after failed deletion",
    stillExisting.policy_code,
    policy.policy_code,
  );

  // 6. Retire the active version (set status to non-active such as "retired")
  const updateVersionBody = {
    status: "retired",
    effective_until: new Date(
      now.getTime() - 30 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPolicyVersion.IUpdate;

  const retiredVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.update(
      connection,
      {
        policyCode: policy.policy_code,
        versionCode: activeVersion.version_code,
        body: updateVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(retiredVersion);
  TestValidator.equals(
    "version status updated to retired",
    retiredVersion.status,
    "retired",
  );

  // 7. Retry deletion, which should now be allowed
  await api.functional.shoppingMall.admin.businessPolicies.erase(connection, {
    policyCode: policy.policy_code,
  });

  // 8. Verify that GET now fails (policy should be gone)
  await TestValidator.error(
    "policy should not be fetchable after successful deletion",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
        policyCode: policy.policy_code,
      });
    },
  );
}
