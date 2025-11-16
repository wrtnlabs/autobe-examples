import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";

/**
 * Validate that an authenticated admin can successfully update an escalation
 * queue entry.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin via join.
 * 2. Create a new escalation queue entry as that admin.
 * 3. Update specific fields (status, priority, assigned_admin_id, resolved_at).
 * 4. Assert the response reflects the changes and the workflow behaves as per
 *    business rules.
 */
export async function test_api_escalation_queue_admin_update_success(
  connection: api.IConnection,
) {
  // 1. Register admin (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  // 2. Create escalation queue entry
  const escalationBody = {
    escalation_type: "refund_dispute", // example valid biz type
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    priority: "high",
    initiator_actor_admin_id: admin.id,
    initiator_actor_seller_id: undefined,
    initiator_actor_customer_id: undefined,
  } satisfies IShoppingMallEscalationQueue.ICreate;
  const createdQueue: IShoppingMallEscalationQueue =
    await api.functional.shoppingMall.admin.escalationQueues.create(
      connection,
      {
        body: escalationBody,
      },
    );
  typia.assert(createdQueue);
  // 3. Prepare changes for update (change status, priority, assign to admin, resolve)
  const updateBody = {
    status: "resolved",
    priority: "urgent",
    assigned_admin_id: admin.id,
    resolved_at: new Date().toISOString() satisfies string,
  } satisfies IShoppingMallEscalationQueue.IUpdate;
  const updated: IShoppingMallEscalationQueue =
    await api.functional.shoppingMall.admin.escalationQueues.update(
      connection,
      {
        id: createdQueue.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4. Validate updates
  TestValidator.equals("status updated", updated.status, updateBody.status);
  TestValidator.equals(
    "priority updated",
    updated.priority,
    updateBody.priority,
  );
  TestValidator.equals(
    "assigned_admin_id updated",
    updated.assigned_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "resolved_at updated",
    updated.resolved_at,
    updateBody.resolved_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.last_updated_at,
    createdQueue.last_updated_at,
  );
}
