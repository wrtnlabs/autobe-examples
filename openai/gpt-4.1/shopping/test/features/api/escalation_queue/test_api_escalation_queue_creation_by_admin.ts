import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";

/**
 * Validate the creation of a new escalation queue record by an admin user.
 *
 * Steps:
 *
 * 1. Register a new admin (join operation) using admin email, password, and name
 * 2. As the newly registered admin, create a new escalation queue by submitting
 *    all required fields (escalation_type, reason_detail, status, priority,
 *    initiator_actor_admin_id)
 * 3. Validate that the escalation queue record is created, returned fields match
 *    input, and the initiator_actor_admin_id correctly matches the
 *    authenticated admin
 */
export async function test_api_escalation_queue_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain identity
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new escalation queue as this admin
  const input = {
    escalation_type: RandomGenerator.pick([
      "refund_dispute",
      "policy_violation",
      "compliance_check",
      "complaint",
      "delivery_exception",
    ] as const),
    reason_detail: RandomGenerator.paragraph({ sentences: 6 }),
    status: RandomGenerator.pick([
      "open",
      "investigating",
      "resolved",
      "closed",
      "rejected",
      "admin_pending",
      "compliance_review",
    ] as const),
    priority: RandomGenerator.pick([
      "low",
      "normal",
      "high",
      "urgent",
      "critical",
    ] as const),
    initiator_actor_admin_id: admin.id,
  } satisfies IShoppingMallEscalationQueue.ICreate;
  const escalationQueue: IShoppingMallEscalationQueue =
    await api.functional.shoppingMall.admin.escalationQueues.create(
      connection,
      {
        body: input,
      },
    );
  typia.assert(escalationQueue);

  // 3. Validate returned escalation record fields and linkage to admin
  TestValidator.equals(
    "escalation_type matches input",
    escalationQueue.escalation_type,
    input.escalation_type,
  );
  TestValidator.equals(
    "reason_detail matches input",
    escalationQueue.reason_detail,
    input.reason_detail,
  );
  TestValidator.equals(
    "status matches input",
    escalationQueue.status,
    input.status,
  );
  TestValidator.equals(
    "priority matches input",
    escalationQueue.priority,
    input.priority,
  );
  TestValidator.equals(
    "initiator_actor_admin_id matches admin id",
    escalationQueue.initiator_actor_admin_id,
    admin.id,
  );

  // Ensure required response fields exist (non-empty id, created_at, last_updated_at)
  TestValidator.predicate(
    "escalation id must be a UUID",
    typeof escalationQueue.id === "string" &&
      /^([0-9a-fA-F\-]){36}$/.test(escalationQueue.id!),
  );
  TestValidator.predicate(
    "created_at must be an ISO date-time string",
    typeof escalationQueue.created_at === "string" &&
      escalationQueue.created_at.length > 0,
  );
  TestValidator.predicate(
    "last_updated_at must be an ISO date-time string",
    typeof escalationQueue.last_updated_at === "string" &&
      escalationQueue.last_updated_at.length > 0,
  );

  // Ensure optional actor linkage fields not relevant are undefined
  TestValidator.equals(
    "initiator_actor_seller_id should be undefined for admin-initiated escalation",
    escalationQueue.initiator_actor_seller_id,
    undefined,
  );
  TestValidator.equals(
    "initiator_actor_customer_id should be undefined for admin-initiated escalation",
    escalationQueue.initiator_actor_customer_id,
    undefined,
  );
}
