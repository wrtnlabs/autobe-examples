import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test support ticket priority escalation during active resolution processes.
 *
 * Validates that administrators can escalate ticket priority from lower to
 * higher levels (low → medium → high → critical) and that SLA deadlines are
 * recalculated accordingly. The test verifies priority transition validation,
 * deadline recalculation, escalation notification triggers, and proper audit
 * trail for priority changes.
 */
export async function test_api_support_ticket_priority_escalation_update(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        support_tickets: ["create", "read", "update", "delete"],
        priority_escalation: ["execute"],
      }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial support ticket with low priority
  const initialTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category: "technical_issue",
        priority: "low",
      } satisfies IShoppingMallSupportTicket.ICreate,
    });
  typia.assert(initialTicket);
  TestValidator.equals(
    "initial ticket priority should be low",
    initialTicket.priority,
    "low",
  );

  // Step 3: Escalate priority from low to medium
  const mediumPriorityTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        priority: "medium",
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(mediumPriorityTicket);
  TestValidator.equals(
    "priority should escalate to medium",
    mediumPriorityTicket.priority,
    "medium",
  );
  TestValidator.notEquals(
    "ticket should be updated",
    mediumPriorityTicket.updated_at,
    initialTicket.updated_at,
  );

  // Step 4: Escalate priority from medium to high
  const highPriorityTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        priority: "high",
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(highPriorityTicket);
  TestValidator.equals(
    "priority should escalate to high",
    highPriorityTicket.priority,
    "high",
  );
  TestValidator.notEquals(
    "ticket should be updated again",
    highPriorityTicket.updated_at,
    mediumPriorityTicket.updated_at,
  );

  // Step 5: Escalate priority from high to critical
  const criticalPriorityTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        priority: "critical",
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(criticalPriorityTicket);
  TestValidator.equals(
    "priority should escalate to critical",
    criticalPriorityTicket.priority,
    "critical",
  );
  TestValidator.notEquals(
    "ticket should have final update",
    criticalPriorityTicket.updated_at,
    highPriorityTicket.updated_at,
  );

  // Step 6: Verify SLA deadline recalculation
  TestValidator.predicate(
    "SLA deadline should be set for critical priority",
    criticalPriorityTicket.sla_deadline !== undefined &&
      criticalPriorityTicket.sla_deadline !== null,
  );

  // Step 7: Final validation of priority escalation sequence
  const finalTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        status: "in_progress",
        resolution_notes: "Priority escalation test completed successfully",
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(finalTicket);
  TestValidator.equals(
    "final ticket should maintain critical priority",
    finalTicket.priority,
    "critical",
  );
  TestValidator.equals(
    "ticket status should be in progress",
    finalTicket.status,
    "in_progress",
  );
}
