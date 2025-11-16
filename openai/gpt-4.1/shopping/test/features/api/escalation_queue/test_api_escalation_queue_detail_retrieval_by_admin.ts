import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";

/**
 * Test scenario where an admin retrieves an escalation queue entry detail after
 * creation.
 *
 * Validates:
 *
 * 1. Admin registration (join) and authentication context setup.
 * 2. Escalation queue entry creation as the authenticated admin.
 * 3. Retrieval of the escalation queue details by id using the admin context.
 * 4. Response includes all fields as defined in IShoppingMallEscalationQueue and
 *    matches input data.
 *
 * Steps:
 *
 * - Register a new admin (join)
 * - Create an escalation queue entry, initiated by this admin
 * - Retrieve and validate that the data matches
 */
export async function test_api_escalation_queue_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Create escalation queue initiated by this admin
  const escalationBody = {
    escalation_type: RandomGenerator.pick([
      "refund_dispute",
      "policy_violation",
      "compliance_check",
      "complaint",
      "delivery_exception",
    ] as const),
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
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
  const created: IShoppingMallEscalationQueue =
    await api.functional.shoppingMall.admin.escalationQueues.create(
      connection,
      { body: escalationBody },
    );
  typia.assert(created);

  // 3. Retrieve the escalation queue entry by id
  const retrieved: IShoppingMallEscalationQueue =
    await api.functional.shoppingMall.admin.escalationQueues.at(connection, {
      id: created.id,
    });
  typia.assert(retrieved);

  // 4. Validate the returned data matches the originally created record fields
  TestValidator.equals(
    "escalation queue id must match",
    retrieved.id,
    created.id,
  );
  TestValidator.equals(
    "escalation_type matches",
    retrieved.escalation_type,
    created.escalation_type,
  );
  TestValidator.equals(
    "reason_detail matches",
    retrieved.reason_detail,
    created.reason_detail,
  );
  TestValidator.equals(
    "priority matches",
    retrieved.priority,
    created.priority,
  );
  TestValidator.equals(
    "workflow status matches",
    retrieved.status,
    created.status,
  );
  TestValidator.equals(
    "initiator_actor_admin_id matches",
    retrieved.initiator_actor_admin_id,
    created.initiator_actor_admin_id,
  );
  TestValidator.equals(
    "initiator_actor_seller_id matches",
    retrieved.initiator_actor_seller_id,
    created.initiator_actor_seller_id,
  );
  TestValidator.equals(
    "initiator_actor_customer_id matches",
    retrieved.initiator_actor_customer_id,
    created.initiator_actor_customer_id,
  );
  TestValidator.equals(
    "assigned_admin_id matches",
    retrieved.assigned_admin_id,
    created.assigned_admin_id,
  );
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "resolved_at matches",
    retrieved.resolved_at,
    created.resolved_at,
  );
  TestValidator.equals(
    "last_updated_at matches",
    retrieved.last_updated_at,
    created.last_updated_at,
  );
}
