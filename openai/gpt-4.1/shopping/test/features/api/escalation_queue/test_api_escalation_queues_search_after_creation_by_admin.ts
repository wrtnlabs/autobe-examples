import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEscalationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";

/**
 * Test searching and filtering of admin escalation queues after creation by an
 * authenticated admin.
 *
 * Steps:
 *
 * 1. Register admin for authentication context.
 * 2. Create a new escalation queue entry as the admin (initiator_actor_admin_id =
 *    admin.id).
 * 3. Run multiple PATCH /shoppingMall/admin/escalationQueues searches:
 *
 *    - By status
 *    - By escalation_type
 *    - By priority
 *    - By assigned_admin_id (should be unassigned after creation)
 *    - By initiator_actor_admin_id
 *    - By pagination (limit=1, page=1)
 * 4. Validate the created escalation appears in filtered results, with correct
 *    summary fields and proper pagination structure.
 * 5. All TestValidator assertions use descriptive titles.
 */
export async function test_api_escalation_queues_search_after_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin for authentication context
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // 2. Create a new escalation queue entry as the admin
  const escalationCreate = {
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
  const escalation =
    await api.functional.shoppingMall.admin.escalationQueues.create(
      connection,
      { body: escalationCreate },
    );
  typia.assert(escalation);

  // 3. Test filter by status
  const pageByStatus =
    await api.functional.shoppingMall.admin.escalationQueues.index(connection, {
      body: { status: escalation.status },
    });
  typia.assert(pageByStatus);
  TestValidator.predicate(
    "search by status includes created escalation",
    pageByStatus.data.some((q) => q.id === escalation.id),
  );

  // 4. Test filter by escalation_type
  const pageByType =
    await api.functional.shoppingMall.admin.escalationQueues.index(connection, {
      body: { escalation_type: escalation.escalation_type },
    });
  typia.assert(pageByType);
  TestValidator.predicate(
    "search by escalation_type includes created escalation",
    pageByType.data.some((q) => q.id === escalation.id),
  );

  // 5. Test filter by priority
  const pageByPriority =
    await api.functional.shoppingMall.admin.escalationQueues.index(connection, {
      body: { priority: escalation.priority },
    });
  typia.assert(pageByPriority);
  TestValidator.predicate(
    "search by priority includes created escalation",
    pageByPriority.data.some((q) => q.id === escalation.id),
  );

  // 6. Test filter by initiator_actor_admin_id
  const pageByInitiator =
    await api.functional.shoppingMall.admin.escalationQueues.index(connection, {
      body: { initiator_actor_admin_id: admin.id },
    });
  typia.assert(pageByInitiator);
  TestValidator.predicate(
    "search by initiator_actor_admin_id includes created escalation",
    pageByInitiator.data.some((q) => q.id === escalation.id),
  );

  // 7. Test filter by assigned_admin_id should return empty or not include the created one (since not assigned)
  if (
    escalation.assigned_admin_id !== undefined &&
    escalation.assigned_admin_id !== null
  ) {
    const pageByAssigned =
      await api.functional.shoppingMall.admin.escalationQueues.index(
        connection,
        { body: { assigned_admin_id: escalation.assigned_admin_id } },
      );
    typia.assert(pageByAssigned);
    TestValidator.predicate(
      "search by assigned_admin_id must include the created escalation if assigned",
      pageByAssigned.data.some((q) => q.id === escalation.id),
    );
  }

  // 8. Test pagination - limit=1, page=1
  const pagePaginated =
    await api.functional.shoppingMall.admin.escalationQueues.index(connection, {
      body: {
        limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(pagePaginated);
  TestValidator.equals(
    "pagination has limit 1",
    pagePaginated.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    pagePaginated.pagination.current === 1,
  );

  // 9. Validate summary fields of the created escalation in the result
  const summaryPages = [
    pageByStatus,
    pageByType,
    pageByPriority,
    pageByInitiator,
    pagePaginated,
  ];
  for (const page of summaryPages) {
    const found = page.data.find((q) => q.id === escalation.id);
    if (found) {
      TestValidator.equals(
        "escalation_type matches",
        found.escalation_type,
        escalation.escalation_type,
      );
      TestValidator.equals("status matches", found.status, escalation.status);
      TestValidator.equals(
        "priority matches",
        found.priority,
        escalation.priority,
      );
      TestValidator.equals(
        "reason_detail matches",
        found.reason_detail,
        escalation.reason_detail,
      );
      TestValidator.equals(
        "created_at matches",
        found.created_at,
        escalation.created_at,
      );
      TestValidator.equals(
        "last_updated_at matches",
        found.last_updated_at,
        escalation.last_updated_at,
      );
    }
  }
}
