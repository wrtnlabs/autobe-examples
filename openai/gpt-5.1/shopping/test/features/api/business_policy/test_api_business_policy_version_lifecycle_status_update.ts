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
 * Validate lifecycle update of a business policy version from draft to active.
 *
 * Business context:
 *
 * - Admins define high-level business policies (e.g., refund, review, seller
 *   governance) and then manage concrete versions of these policies over time.
 * - Each version carries status, effective window, Markdown body, and optional
 *   parameters used by governance engines.
 * - This test ensures that an admin can create a policy and a draft version, then
 *   promote that version to ACTIVE by updating its status and effective
 *   timestamps without breaking identity/audit fields.
 *
 * Steps:
 *
 * 1. Join as an admin using /auth/admin/join to establish an authenticated admin
 *    connection (token is auto-attached to connection headers by SDK).
 * 2. Create a business policy via POST /shoppingMall/admin/businessPolicies using
 *    IShoppingMallBusinessPolicy.ICreate.
 * 3. Create a draft version for that policy via POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions using
 *    IShoppingMallPolicyVersion.ICreate with:
 *
 *    - Status = "draft"
 *    - Effective_from = null
 *    - Effective_until = null
 * 4. Promote the version by calling PUT
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode}
 *    with IShoppingMallPolicyVersion.IUpdate body that:
 *
 *    - Sets status = "active"
 *    - Sets effective_from to a concrete timestamp (e.g., now or near future)
 *    - Leaves effective_until = null
 *    - Tweaks body_markdown to reflect activation.
 * 5. Assert that the response from the update call:
 *
 *    - Preserves id and version_code from the original version.
 *    - Keeps linkage to the same parent policy (policy.code, etc.).
 *    - Reflects the new status = "active".
 *    - Has effective_from equal to the requested timestamp and effective_until still
 *         null.
 *    - Has updated body_markdown content.
 *    - Keeps created_at unchanged while updated_at is not earlier than the original
 *         updated_at and is greater than or equal to created_at.
 */
export async function test_api_business_policy_version_lifecycle_status_update(
  connection: api.IConnection,
) {
  // 1. Admin join: establish authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a business policy
  const policyCode: string = `review_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: `Review Policy ${RandomGenerator.alphabets(6)}`,
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  TestValidator.equals(
    "created policy_code should match input",
    policy.policy_code,
    policyCode,
  );

  // 3. Create an initial draft policy version
  const versionCode: string = `v_${RandomGenerator.alphaNumeric(6)}`;
  const initialBodyMarkdown = RandomGenerator.content({ paragraphs: 2 });

  const versionCreateBody = {
    version_code: versionCode,
    title: `Draft Version ${RandomGenerator.alphabets(4)}`,
    body_markdown: initialBodyMarkdown,
    parameters_json: null,
    status: "draft",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const draftVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(draftVersion);

  TestValidator.equals(
    "draft version_code should match input",
    draftVersion.version_code,
    versionCode,
  );
  TestValidator.equals(
    "draft version status should be 'draft'",
    draftVersion.status,
    "draft",
  );
  TestValidator.equals(
    "draft version effective_from should be null",
    draftVersion.effective_from,
    null,
  );
  TestValidator.equals(
    "draft version effective_until should be null",
    draftVersion.effective_until,
    null,
  );

  // 4. Promote the draft version to active with effective window
  const activationTimestamp: string = new Date().toISOString();
  const updatedBodyMarkdown = `${initialBodyMarkdown}\n\nStatus: ACTIVE`;

  const versionUpdateBody = {
    status: "active",
    effective_from: activationTimestamp,
    effective_until: null,
    body_markdown: updatedBodyMarkdown,
  } satisfies IShoppingMallPolicyVersion.IUpdate;

  const updatedVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.update(
      connection,
      {
        policyCode: policy.policy_code,
        versionCode: draftVersion.version_code,
        body: versionUpdateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(updatedVersion);

  // 5. Assert identity and linkage stability
  TestValidator.equals(
    "updated version id should equal original id",
    updatedVersion.id,
    draftVersion.id,
  );
  TestValidator.equals(
    "updated version_code should equal original version_code",
    updatedVersion.version_code,
    draftVersion.version_code,
  );
  TestValidator.equals(
    "updated version policy code should equal parent policy_code",
    updatedVersion.policy.code,
    policy.policy_code,
  );

  // Assert lifecycle and content changes
  TestValidator.equals(
    "version status should be 'active' after update",
    updatedVersion.status,
    "active",
  );
  TestValidator.equals(
    "effective_from should equal requested activation timestamp",
    updatedVersion.effective_from,
    activationTimestamp,
  );
  TestValidator.equals(
    "effective_until should remain null after update",
    updatedVersion.effective_until,
    null,
  );
  TestValidator.equals(
    "body_markdown should be updated",
    updatedVersion.body_markdown,
    updatedBodyMarkdown,
  );

  // Audit timestamps: created_at stable, updated_at moves forward or at least changes
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedVersion.created_at,
    draftVersion.created_at,
  );

  const createdAtMillis = Date.parse(draftVersion.created_at);
  const updatedAtMillis = Date.parse(updatedVersion.updated_at);

  await TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    async () => updatedAtMillis >= createdAtMillis,
  );

  // Additionally, updated_at should not be earlier than original updated_at
  const originalUpdatedAtMillis = Date.parse(draftVersion.updated_at);
  await TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    async () => updatedAtMillis >= originalUpdatedAtMillis,
  );
}
