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
 * Extend effective window of an active policy override while preserving other
 * configuration.
 *
 * Business flow:
 *
 * 1. Join as an admin to obtain authenticated context for admin-only operations.
 * 2. Create a base business policy (category "refund") and mark it active.
 * 3. Create an active policy version under that policy, with an effective window
 *    in the near term.
 * 4. Create an active policy override for a concrete subject (subject_type
 *    "seller") bound to this version.
 * 5. Update only the override's effective_until via PUT, extending its validity
 *    window.
 * 6. Validate that all other override fields remain unchanged and that updated_at
 *    has advanced while created_at is stable.
 */
export async function test_api_policy_override_update_active_window_extension(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create base business policy (category "refund")
  const policyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    category: "refund",
    description: RandomGenerator.paragraph({
      sentences: 6,
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
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 3. Create active policy version under the policy
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const initialEffectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day

  const versionCreateBody = {
    version_code: `v1_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 10,
    }),
    parameters_json: JSON.stringify({ refundWindowDaysDefault: 7 }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: initialEffectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(version);

  // 4. Create an initial active policy override for a concrete subject
  const subjectId = typia.random<string & tags.Format<"uuid">>();
  const overrideCreateBody = {
    shopping_mall_policy_version_id: version.id,
    subject_type: "seller",
    subject_id: subjectId,
    subject_display: RandomGenerator.name(2),
    override_code: "refund_window_days",
    override_value: "14",
    reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    effective_from: version.effective_from ?? effectiveFrom,
    effective_until: new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(), // +3 days
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(createdOverride);

  const originalEffectiveFrom = createdOverride.effective_from ?? null;
  const originalEffectiveUntil = createdOverride.effective_until ?? null;

  // 5. Extend only effective_until via update
  const extendedEffectiveUntil = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString(); // +5 days

  const updateBody = {
    effective_until: extendedEffectiveUntil,
  } satisfies IShoppingMallPolicyOverride.IUpdate;

  const updatedOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.update(connection, {
      policyOverrideId: createdOverride.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(updatedOverride);

  // 6. Validate invariants and extension semantics
  TestValidator.equals(
    "override id should remain unchanged after update",
    updatedOverride.id,
    createdOverride.id,
  );

  TestValidator.equals(
    "policy version id should remain unchanged",
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
    updatedOverride.subject_id,
    createdOverride.subject_id,
  );

  TestValidator.equals(
    "subject_display should remain unchanged",
    updatedOverride.subject_display,
    createdOverride.subject_display,
  );

  TestValidator.equals(
    "override_code should remain unchanged",
    updatedOverride.override_code,
    createdOverride.override_code,
  );

  TestValidator.equals(
    "override_value should remain unchanged",
    updatedOverride.override_value,
    createdOverride.override_value,
  );

  TestValidator.equals(
    "status should remain active after window extension",
    updatedOverride.status,
    createdOverride.status,
  );

  TestValidator.equals(
    "effective_from should remain unchanged after update",
    updatedOverride.effective_from,
    originalEffectiveFrom,
  );

  TestValidator.equals(
    "effective_until should be updated to extended value",
    updatedOverride.effective_until,
    extendedEffectiveUntil,
  );

  // Chronological check: updated effective_until is not earlier than original
  if (originalEffectiveUntil !== null && updatedOverride.effective_until) {
    const orig = new Date(originalEffectiveUntil).getTime();
    const ext = new Date(updatedOverride.effective_until).getTime();
    TestValidator.predicate(
      "extended effective_until should be >= original effective_until",
      ext >= orig,
    );
  }

  // 7. Audit fields sanity: updated_at should advance, created_at stable
  TestValidator.equals(
    "created_at should remain unchanged after override update",
    updatedOverride.created_at,
    createdOverride.created_at,
  );

  TestValidator.predicate(
    "updated_at should be different after override update",
    updatedOverride.updated_at !== createdOverride.updated_at,
  );
}
