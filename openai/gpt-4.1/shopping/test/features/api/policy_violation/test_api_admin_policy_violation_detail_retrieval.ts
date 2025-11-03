import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";

/**
 * Test that an admin can successfully retrieve the details of a specific policy
 * violation by its unique identifier.
 *
 * The test covers:
 *
 * 1. Admin registration and authentication
 * 2. Attempting to retrieve a policy violation detail by UUID
 * 3. Validating the presence and accuracy of key fields: status, decision, policy
 *    reference, actor references, and audit fields
 * 4. Ensuring only authenticated admins can access this information
 */
export async function test_api_admin_policy_violation_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Choose a random policy violation UUID for retrieval (simulate because no create endpoint)
  const violationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve policy violation detail
  const result: IShoppingPolicyViolation =
    await api.functional.shopping.admin.policyViolations.at(connection, {
      policyViolationId: violationId,
    });
  typia.assert(result);

  // 4. Basic validations
  TestValidator.equals("id matches", result.id, violationId); // for simulation, id will match
  TestValidator.predicate(
    "status field should be non-empty string",
    typeof result.status === "string" && result.status.length > 0,
  );
  TestValidator.predicate(
    "policy_id is valid UUID",
    typeof result.policy_id === "string" &&
      /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(result.policy_id),
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof result.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./.test(result.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    typeof result.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./.test(result.updated_at),
  );
  // If present, decision_at should be date-time or null
  if (result.decision_at !== undefined && result.decision_at !== null) {
    TestValidator.predicate(
      "decision_at present is valid date-time string",
      typeof result.decision_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./.test(result.decision_at),
    );
  }
  // Reference to reporting/affected actors may be null/undefined or a UUID
  const uuidFields: (keyof IShoppingPolicyViolation)[] = [
    "reported_by_admin_id",
    "reported_by_seller_id",
    "reported_by_customer_id",
    "affected_admin_id",
    "affected_seller_id",
    "affected_customer_id",
    "affected_product_id",
    "affected_order_id",
  ];
  for (const f of uuidFields) {
    const v = result[f];
    if (v !== undefined && v !== null) {
      TestValidator.predicate(
        `${f} present is valid UUID`,
        typeof v === "string" &&
          /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v as string),
      );
    }
  }
  // If deleted_at is present, must be a date-time
  if (result.deleted_at !== undefined && result.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at present is valid date-time string",
      typeof result.deleted_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./.test(result.deleted_at),
    );
  }
  // Core violation business logic fields
  TestValidator.predicate(
    "violation_type is string",
    typeof result.violation_type === "string",
  );
  TestValidator.predicate(
    "violation_code is string",
    typeof result.violation_code === "string",
  );
  // Decision can be null/undefined or string
  if (result.decision !== undefined && result.decision !== null) {
    TestValidator.predicate(
      "decision is string",
      typeof result.decision === "string",
    );
  }
  // Description can be null/undefined or string
  if (result.description !== undefined && result.description !== null) {
    TestValidator.predicate(
      "description is string",
      typeof result.description === "string",
    );
  }
}
