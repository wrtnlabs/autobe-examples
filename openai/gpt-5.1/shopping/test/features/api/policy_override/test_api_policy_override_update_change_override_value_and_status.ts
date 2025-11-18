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
 * Tighten an existing policy override by changing override_value and status.
 *
 * Business context:
 *
 * - Admins manage high-level business policies (like risk rules) via
 *   businessPolicies.
 * - Concrete rule configurations live in policyVersions.
 * - For specific subjects (e.g., sellers), admins can define policyOverrides that
 *   replace or refine parts of a policy version.
 * - Over time, overrides may need to be tightened by changing override_value
 *   (e.g., lowering a risk threshold) and updating status.
 *
 * This E2E test validates that an admin can:
 *
 * 1. Join as an admin (creating credentials and tokens) via /auth/admin/join.
 * 2. Create a risk-category business policy marked active.
 * 3. Create an active policy version for that policy with an effective window that
 *    is currently valid.
 * 4. Create an active policy override for a specific subject (e.g. seller) with an
 *    initial, more lenient override_value.
 * 5. Update that override using PUT /shoppingMall/admin/policyOverrides/{id} to:
 *
 *    - Change override_value to a more restrictive value,
 *    - Change status from "active" to another status (e.g., "pending"),
 *    - Extend the justification reason.
 * 6. Assert that the returned override:
 *
 *    - Preserves identity (same id),
 *    - Has new override_value and status,
 *    - Has unchanged policy & subject identity fields,
 *    - Has unchanged created_at but updated_at advanced,
 *    - Does not unexpectedly change approval fields in this scenario.
 */
export async function test_api_policy_override_update_change_override_value_and_status(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain admin authorization context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a risk-category active business policy.
  const policyCreateBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    category: "risk",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policy);

  // 3. Create an active policy version for this policy with current effective window.
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day

  const versionCreateBody = {
    version_code: `v-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    parameters_json: JSON.stringify({ riskLimit: 100, mode: "lenient" }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert(policyVersion);

  // 4. Create an initial active policy override for a specific subject.
  // Use subject_type "seller" and a random UUID subject_id.
  const subjectId = typia.random<string & tags.Format<"uuid">>();

  const initialOverrideValue = "100"; // lenient (e.g., risk score threshold 100)
  const initialOverrideStatus = "active";

  const overrideCreateBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "seller",
    subject_id: subjectId,
    subject_display: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    override_code: "risk_threshold",
    override_value: initialOverrideValue,
    reason: "Initial lenient risk threshold for monitoring.",
    status: initialOverrideStatus,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert(createdOverride);

  // 5. Update the override: tighten override_value and change status.
  const newOverrideValue = "50"; // stricter threshold
  const newStatus = "pending"; // move from active to pending review, for example
  const updatedReason =
    `${createdOverride.reason ?? ""} Tightened for increased risk control.`.trim();

  const updateBody = {
    override_value: newOverrideValue,
    status: newStatus,
    reason: updatedReason,
    // keep effective window unchanged in this scenario
    effective_from: createdOverride.effective_from ?? null,
    effective_until: createdOverride.effective_until ?? null,
  } satisfies IShoppingMallPolicyOverride.IUpdate;

  const updatedOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.update(connection, {
      policyOverrideId: createdOverride.id,
      body: updateBody,
    });
  typia.assert(updatedOverride);

  // 6. Business assertions.
  // Identity must remain the same.
  TestValidator.equals(
    "policy override id should remain unchanged after update",
    updatedOverride.id,
    createdOverride.id,
  );

  // override_value must be updated to the stricter value.
  TestValidator.equals(
    "override_value should be updated to stricter value",
    updatedOverride.override_value,
    newOverrideValue,
  );

  // status must reflect the new status.
  TestValidator.equals(
    "override status should be updated",
    updatedOverride.status,
    newStatus,
  );

  // Policy and subject identity fields should remain unchanged.
  TestValidator.equals(
    "shopping_mall_policy_version_id should remain unchanged",
    updatedOverride.shopping_mall_policy_version_id,
    createdOverride.shopping_mall_policy_version_id,
  );

  TestValidator.equals(
    "subject_type should remain unchanged",
    updatedOverride.subject_type,
    createdOverride.subject_type,
  );

  TestValidator.equals(
    "subject_id should remain unchanged",
    updatedOverride.subject_id ?? null,
    createdOverride.subject_id ?? null,
  );

  TestValidator.equals(
    "created_by_admin_id should remain unchanged",
    updatedOverride.created_by_admin_id,
    createdOverride.created_by_admin_id,
  );

  // created_at must remain the same, updated_at should change.
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedOverride.created_at,
    createdOverride.created_at,
  );

  await TestValidator.predicate(
    "updated_at should be changed after update",
    async () => {
      return updatedOverride.updated_at !== createdOverride.updated_at;
    },
  );

  // Approval-related fields should not be implicitly changed by this scenario.
  TestValidator.equals(
    "approved_by_admin_id should remain unchanged in non-approval update",
    updatedOverride.approved_by_admin_id ?? null,
    createdOverride.approved_by_admin_id ?? null,
  );

  TestValidator.equals(
    "approvedByAdmin summary should remain unchanged in non-approval update",
    updatedOverride.approvedByAdmin ?? null,
    createdOverride.approvedByAdmin ?? null,
  );
}
