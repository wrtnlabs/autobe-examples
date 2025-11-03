import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";

/**
 * Validate admin policy violation update with business and audit compliance.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate.
 * 2. Attempt update on non-existent policy violation (expect error).
 * 3. Generate a policy violation via typia.random and update it.
 * 4. Update mutable fields; check response reflects new values.
 * 5. Confirm immutable fields remain unchanged.
 * 6. Ensure schema prevents non-existent/immutable field updates at compile-time.
 */
export async function test_api_admin_policy_violation_update(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Attempt to update a non-existent policy violation
  await TestValidator.error(
    "update non-existent policy violation causes error",
    async () => {
      await api.functional.shopping.admin.policyViolations.update(connection, {
        policyViolationId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IShoppingPolicyViolation.IUpdate>(),
      });
    },
  );

  // 3. Generate a mock policy violation (simulate as no create API exists)
  // (In real scenario, would insert through DB setup or another API.)
  const violation: IShoppingPolicyViolation =
    typia.random<IShoppingPolicyViolation>();
  typia.assert(violation);

  // 4. Update all mutable fields
  const updateBody = {
    violation_type: RandomGenerator.pick([
      "abuse",
      "fraud",
      "duplicate_account",
      "policy_breach",
    ] as const),
    violation_code: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.pick([
      "open",
      "under_review",
      "resolved",
      "escalated",
      "invalid",
      "canceled",
    ] as const),
    decision: RandomGenerator.paragraph({ sentences: 1 }),
    decision_at: new Date().toISOString(),
  } satisfies IShoppingPolicyViolation.IUpdate;
  const updated: IShoppingPolicyViolation =
    await api.functional.shopping.admin.policyViolations.update(connection, {
      policyViolationId: violation.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Confirm updated values reflect
  TestValidator.equals(
    "violation_type updated",
    updated.violation_type,
    updateBody.violation_type,
  );
  TestValidator.equals(
    "violation_code updated",
    updated.violation_code,
    updateBody.violation_code,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals("status updated", updated.status, updateBody.status);
  TestValidator.equals(
    "decision updated",
    updated.decision,
    updateBody.decision,
  );
  TestValidator.equals(
    "decision_at updated",
    updated.decision_at,
    updateBody.decision_at,
  );
  // 6. Confirm immutable fields did not change
  TestValidator.equals("id not changed", updated.id, violation.id);
  TestValidator.equals(
    "policy_id not changed",
    updated.policy_id,
    violation.policy_id,
  );
  TestValidator.equals(
    "created_at not changed",
    updated.created_at,
    violation.created_at,
  );
  TestValidator.equals(
    "affected_admin_id not changed",
    updated.affected_admin_id,
    violation.affected_admin_id,
  );
  TestValidator.equals(
    "affected_seller_id not changed",
    updated.affected_seller_id,
    violation.affected_seller_id,
  );
  TestValidator.equals(
    "affected_customer_id not changed",
    updated.affected_customer_id,
    violation.affected_customer_id,
  );
  TestValidator.equals(
    "affected_product_id not changed",
    updated.affected_product_id,
    violation.affected_product_id,
  );
  TestValidator.equals(
    "affected_order_id not changed",
    updated.affected_order_id,
    violation.affected_order_id,
  );
  // 7. Confirm audit field(s) changed for business event (updated_at)
  TestValidator.notEquals(
    "updated_at modified",
    updated.updated_at,
    violation.updated_at,
  );
  // 8. Type-level: schema prevents updating non-IUpdate fields (compile-time guaranteed)
}
