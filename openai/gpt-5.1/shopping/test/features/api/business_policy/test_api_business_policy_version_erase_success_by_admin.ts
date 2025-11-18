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
 * Validate that an authenticated admin can erase a non-active business policy
 * version without impacting the parent business policy, and that the erased
 * version is no longer deletable.
 *
 * Business context:
 *
 * - Admins manage logical business policies (refund rules, review moderation,
 *   etc.) and their concrete versions.
 * - Only admins can manipulate policies and versions.
 * - A version that is not active (e.g., `draft`) is safe to erase.
 *
 * Test steps:
 *
 * 1. Admin join: register a new admin through POST /auth/admin/join and rely on
 *    the SDK to attach the Authorization header automatically.
 * 2. Create parent policy: call POST /shoppingMall/admin/businessPolicies with
 *    IShoppingMallBusinessPolicy.ICreate using a unique policy_code, a
 *    meaningful name and category, optional description, and is_active=true.
 * 3. Create non-active version: call POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions with
 *    IShoppingMallPolicyVersion.ICreate, using the created policy_code,
 *    version_code, title, body_markdown, optional parameters_json, status set
 *    to a non-active value such as "draft", and optional effective_from and
 *    effective_until timestamps.
 * 4. Erase the version: call DELETE
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode}
 *    using api.functional.shoppingMall.admin.businessPolicies.versions.erase.
 *    Expect the call to complete without error, indicating successful erase.
 * 5. Validate erase via negative deletion: call the same erase endpoint again with
 *    identical policyCode and versionCode, but this time wrap the call in
 *    TestValidator.error to assert that the second attempt fails, implying the
 *    version no longer exists or is no longer deletable.
 * 6. Verify parent policy integrity: create another policy version under the same
 *    policyCode after the erase to confirm that the parent policy is still
 *    present and can accept new versions. Validate the returned
 *    IShoppingMallPolicyVersion with typia.assert and ensure its policy.code
 *    matches the original policy_code.
 */
export async function test_api_business_policy_version_erase_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join - create and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create parent business policy
  const policyCode: string = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: `Refund Policy ${RandomGenerator.name(2)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policy);

  TestValidator.equals(
    "created policy_code should match input",
    policy.policy_code,
    policyCode,
  );
  TestValidator.predicate(
    "created policy must be active",
    policy.is_active === true,
  );

  // 3. Create a non-active (draft) policy version
  const versionCode: string = `v_${RandomGenerator.alphaNumeric(6)}`;

  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const versionCreateBody = {
    version_code: versionCode,
    title: `Draft Version ${RandomGenerator.name(1)}`,
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ maxRefundDays: 30, allowPartial: true }),
    status: "draft",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const draftVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionCreateBody,
      },
    );
  typia.assert(draftVersion);

  TestValidator.equals(
    "created version_code should match input",
    draftVersion.version_code,
    versionCode,
  );
  TestValidator.equals(
    "created version status must be draft",
    draftVersion.status,
    "draft",
  );
  TestValidator.equals(
    "parent policy code on version matches policy_code",
    draftVersion.policy.code,
    policyCode,
  );

  // 4. Erase the draft version (expect success, no error)
  await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
    connection,
    {
      policyCode,
      versionCode,
    },
  );

  // 5. Validate erase by asserting that a second erase fails
  await TestValidator.error(
    "second erase on same version should fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        connection,
        {
          policyCode,
          versionCode,
        },
      );
    },
  );

  // 6. Verify parent policy still works by creating another version
  const nextVersionCode: string = `v_${RandomGenerator.alphaNumeric(6)}`;

  const secondVersionBody = {
    version_code: nextVersionCode,
    title: `Second Version ${RandomGenerator.name(1)}`,
    body_markdown: RandomGenerator.content({ paragraphs: 1 }),
    parameters_json: JSON.stringify({ maxRefundDays: 14, allowPartial: false }),
    status: "draft",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const secondVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: secondVersionBody,
      },
    );
  typia.assert(secondVersion);

  TestValidator.equals(
    "second version belongs to same parent policy",
    secondVersion.policy.code,
    policyCode,
  );
  TestValidator.equals(
    "second version_code should match input",
    secondVersion.version_code,
    nextVersionCode,
  );
}
