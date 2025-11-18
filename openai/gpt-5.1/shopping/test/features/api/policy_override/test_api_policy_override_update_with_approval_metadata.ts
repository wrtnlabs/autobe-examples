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
 * Validate approval workflow metadata updates on policy overrides.
 *
 * Business scenario:
 *
 * - Admin A defines a business policy and an active policy version.
 * - Admin A creates a pending policy override scoped to some subject.
 * - Admin B (a different admin) approves the override by updating its status and
 *   approved_by_admin_id via PUT /shoppingMall/admin/policyOverrides/{id}.
 * - The test validates that creator metadata is preserved, approval metadata is
 *   correctly set to Admin B, and timestamps/status behave as expected.
 * - A follow-up update moves the override to another status while approval
 *   metadata remains stable.
 *
 * Steps:
 *
 * 1. Admin A joins.
 * 2. Admin A creates a business policy.
 * 3. Admin A creates an active policy version under that policy.
 * 4. Admin A creates a pending policy override referencing that version.
 * 5. Admin B joins (changing the connection authorization to Admin B).
 * 6. Admin B updates the override to active, setting approved_by_admin_id and
 *    adjusting reason.
 * 7. Validate approval metadata (creator vs approver, timestamps, status).
 * 8. Optionally perform another update to move the override to "expired" while
 *    keeping approval metadata intact and validate again.
 */
export async function test_api_policy_override_update_with_approval_metadata(
  connection: api.IConnection,
) {
  // 1. Admin A joins and becomes the current authenticated admin.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminA!234" as string & tags.Format<"password">,
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: "https://admin-a.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin-a.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Admin A creates a business policy.
  const policyCode: string = `reviews_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: "Review governance policy",
    category: "reviews",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(businessPolicy);

  TestValidator.equals(
    "policy_code of created business policy matches request",
    businessPolicy.policy_code,
    policyCreateBody.policy_code,
  );

  // 3. Admin A creates an active policy version under that policy.
  const versionCode: string = `v_${RandomGenerator.alphaNumeric(4)}`;
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const policyVersionCreateBody = {
    version_code: versionCode,
    title: "Initial active review policy version",
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    parameters_json: JSON.stringify({
      maxReviewsPerDay: 10,
      minRatingThreshold: 3,
    }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionCreateBody,
      },
    );
  typia.assert(policyVersion);

  TestValidator.equals(
    "policy version code matches requested version_code",
    policyVersion.version_code,
    policyVersionCreateBody.version_code,
  );

  // 4. Admin A creates a pending policy override referencing that version.
  const subjectId = typia.random<string & tags.Format<"uuid">>();

  const overrideCreateBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "seller",
    subject_id: subjectId,
    subject_display: `Seller ${RandomGenerator.name(1)}`,
    override_code: "review_visibility_window",
    override_value: JSON.stringify({ windowHours: 12 }),
    reason: "Initial pending override for special seller review policy.",
    status: "pending",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert(createdOverride);

  // Capture baseline fields for later comparison.
  const originalCreatedAt: string = createdOverride.created_at;
  const originalUpdatedAt: string = createdOverride.updated_at;
  const originalCreatedByAdminId: string = createdOverride.created_by_admin_id;

  TestValidator.equals(
    "override's policy version id matches created version",
    createdOverride.shopping_mall_policy_version_id,
    policyVersion.id,
  );

  TestValidator.equals(
    "override created_by_admin_id should be Admin A's id",
    createdOverride.created_by_admin_id,
    adminA.id,
  );

  TestValidator.equals(
    "override status is pending after creation",
    createdOverride.status,
    "pending",
  );

  // 5. Admin B joins, updating the connection to use Admin B's Authorization.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminB!234" as string & tags.Format<"password">,
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: "https://admin-b.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin-b.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // 6. Admin B approves the override: status->active, set approved_by_admin_id, update reason.
  const approvalNote =
    "Approved by Admin B for temporary seller review relaxation.";

  const firstUpdateBody = {
    approved_by_admin_id: adminB.id,
    status: "active",
    reason: `${overrideCreateBody.reason} ${approvalNote}`,
  } satisfies IShoppingMallPolicyOverride.IUpdate;

  const approvedOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.update(connection, {
      policyOverrideId: createdOverride.id,
      body: firstUpdateBody,
    });
  typia.assert(approvedOverride);

  // 7. Validate approval metadata and timestamps.
  TestValidator.equals(
    "approved override id should match original override id",
    approvedOverride.id,
    createdOverride.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged after approval update",
    approvedOverride.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should be updated after approval update",
    approvedOverride.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "creator admin id remains Admin A",
    approvedOverride.created_by_admin_id,
    originalCreatedByAdminId,
  );

  if (approvedOverride.createdByAdmin !== undefined) {
    TestValidator.equals(
      "createdByAdmin.id should equal Admin A's id when present",
      approvedOverride.createdByAdmin.id,
      adminA.id,
    );
    TestValidator.equals(
      "createdByAdmin.email should equal Admin A's email when present",
      approvedOverride.createdByAdmin.email,
      adminA.email,
    );
  }

  TestValidator.equals(
    "status should be active after approval update",
    approvedOverride.status,
    "active",
  );

  TestValidator.predicate(
    "approved_by_admin_id should be non-null after approval update",
    approvedOverride.approved_by_admin_id !== null &&
      approvedOverride.approved_by_admin_id !== undefined,
  );

  if (
    approvedOverride.approved_by_admin_id !== null &&
    approvedOverride.approved_by_admin_id !== undefined
  ) {
    TestValidator.equals(
      "approved_by_admin_id should equal Admin B's id",
      approvedOverride.approved_by_admin_id,
      adminB.id,
    );
  }

  if (approvedOverride.approvedByAdmin !== undefined) {
    if (approvedOverride.approvedByAdmin !== null) {
      TestValidator.equals(
        "approvedByAdmin.id should equal Admin B's id when present",
        approvedOverride.approvedByAdmin.id,
        adminB.id,
      );
      TestValidator.equals(
        "approvedByAdmin.email should equal Admin B's email when present",
        approvedOverride.approvedByAdmin.email,
        adminB.email,
      );
    }
  }

  TestValidator.equals(
    "reason should include approval note after update",
    approvedOverride.reason,
    firstUpdateBody.reason,
  );

  // 8. Second update: move to a terminal status while preserving approval metadata.
  const secondUpdateBody = {
    status: "expired",
  } satisfies IShoppingMallPolicyOverride.IUpdate;

  const expiredOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.update(connection, {
      policyOverrideId: createdOverride.id,
      body: secondUpdateBody,
    });
  typia.assert(expiredOverride);

  TestValidator.equals(
    "expired override id matches original",
    expiredOverride.id,
    createdOverride.id,
  );

  TestValidator.equals(
    "status should be expired after second update",
    expiredOverride.status,
    "expired",
  );

  if (
    expiredOverride.approved_by_admin_id !== null &&
    expiredOverride.approved_by_admin_id !== undefined
  ) {
    TestValidator.equals(
      "approved_by_admin_id should remain Admin B's id after status change",
      expiredOverride.approved_by_admin_id,
      adminB.id,
    );
  }

  if (expiredOverride.approvedByAdmin !== undefined) {
    if (expiredOverride.approvedByAdmin !== null) {
      TestValidator.equals(
        "approvedByAdmin should still refer to Admin B after status change",
        expiredOverride.approvedByAdmin.id,
        adminB.id,
      );
    }
  }
}
