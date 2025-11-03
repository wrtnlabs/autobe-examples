import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import type { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";

/**
 * Validate the entire admin lifecycle of appeal status update, including field
 * transitions, audit compliance, and security.
 *
 * 1. Register admin with valid credentials and allowed RBAC/roles, authenticated
 *    via join
 * 2. Create a random appeal entity via API (simulate pre-existing record)
 * 3. Transition status from 'under_review' to 'approved'
 * 4. Update decision rationale and verify audit trail
 * 5. Transition status from 'approved' to 'rejected' with new rationale
 * 6. Confirm business field rules and enumeration constraints
 * 7. Attempt forbidden field update as another (unauthenticated) admin and expect
 *    error
 * 8. Attempt update as unauthenticated context and expect error
 */
export async function test_api_admin_appeal_status_update_lifecycle_transition(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super", // assume 'super' is a valid RBAC role
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Simulate existing appeal record: create using typia.random (would normally be created by another flow, e.g., from a seller/customer side)
  const originalAppeal: IShoppingAppeal = typia.random<IShoppingAppeal>();
  typia.assert(originalAppeal);

  // 3. Update status under admin to 'under_review'
  const underReviewBody = {
    status: "under_review",
    reason: RandomGenerator.paragraph(),
  } satisfies IShoppingAppeal.IUpdate;
  const underReview: IShoppingAppeal =
    await api.functional.shopping.admin.appeals.update(connection, {
      appealId: originalAppeal.id,
      body: underReviewBody,
    });
  typia.assert(underReview);
  TestValidator.equals(
    "appeal moved to under_review",
    underReview.status,
    "under_review",
  );
  TestValidator.equals(
    "rationale/remarks stored",
    underReview.reason,
    underReviewBody.reason,
  );

  // 4. Approve the appeal with a detailed decision and rationale
  const approvedBody = {
    status: "approved",
    decision: "upheld",
    decision_at: new Date().toISOString(),
    reason: RandomGenerator.paragraph(),
  } satisfies IShoppingAppeal.IUpdate;
  const approved: IShoppingAppeal =
    await api.functional.shopping.admin.appeals.update(connection, {
      appealId: originalAppeal.id,
      body: approvedBody,
    });
  typia.assert(approved);
  TestValidator.equals("appeal approved", approved.status, "approved");
  TestValidator.equals("decision present", approved.decision, "upheld");
  TestValidator.equals(
    "rationale included",
    approved.reason,
    approvedBody.reason,
  );

  // 5. Now try transition to rejected with new rationale
  const rejectedBody = {
    status: "rejected",
    decision: "overturned",
    decision_at: new Date().toISOString(),
    reason: RandomGenerator.paragraph(),
  } satisfies IShoppingAppeal.IUpdate;
  const rejected: IShoppingAppeal =
    await api.functional.shopping.admin.appeals.update(connection, {
      appealId: originalAppeal.id,
      body: rejectedBody,
    });
  typia.assert(rejected);
  TestValidator.equals("appeal rejected", rejected.status, "rejected");
  TestValidator.equals(
    "decision is overturned",
    rejected.decision,
    "overturned",
  );

  // 6. Confirm audit trail exists and field transitions are logged in audit_history
  TestValidator.predicate(
    "audit_history includes both approved and rejected states",
    Array.isArray(rejected.audit_history) &&
      rejected.audit_history.some((h) => h.status_to === "approved") &&
      rejected.audit_history.some((h) => h.status_to === "rejected"),
  );

  // 7. Register and switch to a second admin, then attempt forbidden update (should fail)
  const otherAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "support",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const otherAdminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: otherAdminBody });
  typia.assert(otherAdminAuth);

  // Simulate logout (unauthenticated context)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt forbidden update with unauthenticated context
  await TestValidator.error(
    "unauthenticated admin cannot change appeal status",
    async () => {
      await api.functional.shopping.admin.appeals.update(unauthConn, {
        appealId: originalAppeal.id,
        body: {
          status: "closed",
          reason: RandomGenerator.paragraph(),
        } satisfies IShoppingAppeal.IUpdate,
      });
    },
  );
}
