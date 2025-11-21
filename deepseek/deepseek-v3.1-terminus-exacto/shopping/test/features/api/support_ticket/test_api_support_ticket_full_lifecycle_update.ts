import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test complete support ticket lifecycle through status transitions from
 * creation to resolution and closure. Validates that administrators can update
 * ticket status through proper workflow progression: new → open → in_progress →
 * resolved → closed. The test verifies status transition validation, resolution
 * note documentation, closure verification, and proper timestamp recording for
 * each status change. Business logic includes workflow enforcement, status
 * transition rules, and audit trail maintenance throughout the ticket
 * lifecycle.
 */
export async function test_api_support_ticket_full_lifecycle_update(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ canManageTickets: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Generate realistic ticket data with random categories and priorities
  const categories = [
    "technical_issue",
    "billing_problem",
    "account_security",
    "product_question",
    "general_feedback",
  ] as const;
  const priorities = ["low", "medium", "high", "critical"] as const;

  const selectedCategory = RandomGenerator.pick(categories);
  const selectedPriority = RandomGenerator.pick(priorities);

  // Step 2: Create initial support ticket with status 'new'
  const ticketData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category: selectedCategory,
    priority: selectedPriority,
  } satisfies IShoppingMallSupportTicket.ICreate;

  const createdTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: ticketData,
    });
  typia.assert(createdTicket);

  TestValidator.equals(
    "initial ticket status should be new",
    createdTicket.status,
    "new",
  );
  TestValidator.equals(
    "ticket title matches creation data",
    createdTicket.title,
    ticketData.title,
  );
  TestValidator.equals(
    "ticket category matches creation data",
    createdTicket.category,
    selectedCategory,
  );
  TestValidator.equals(
    "ticket priority matches creation data",
    createdTicket.priority,
    selectedPriority,
  );

  // Step 3: Update ticket status from 'new' to 'open' with SLA deadline
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const openTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: createdTicket.id,
      body: {
        status: "open",
        sla_deadline: tomorrow,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(openTicket);
  TestValidator.equals(
    "ticket status should be open",
    openTicket.status,
    "open",
  );
  TestValidator.equals(
    "SLA deadline should be set",
    openTicket.sla_deadline,
    tomorrow,
  );

  // Step 4: Update ticket status from 'open' to 'in_progress' with updated details
  const inProgressTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: createdTicket.id,
      body: {
        status: "in_progress",
        title: "[In Progress] " + createdTicket.title,
        description:
          createdTicket.description +
          "\n\nIssue is currently being investigated by our technical team.",
        priority: "high", // Escalate priority during investigation
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(inProgressTicket);
  TestValidator.equals(
    "ticket status should be in_progress",
    inProgressTicket.status,
    "in_progress",
  );
  TestValidator.predicate(
    "title should indicate in progress status",
    inProgressTicket.title.startsWith("[In Progress] "),
  );
  TestValidator.equals(
    "priority should be escalated",
    inProgressTicket.priority,
    "high",
  );

  // Step 5: Update ticket status from 'in_progress' to 'resolved' with comprehensive resolution notes
  const resolutionTime = new Date().toISOString();
  const resolvedTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: createdTicket.id,
      body: {
        status: "resolved",
        resolution_notes: `Issue resolved successfully.\n\nRoot Cause: Software configuration mismatch\nSolution Applied: Updated configuration settings and verified functionality\nCustomer Communication: Customer confirmed resolution via email on ${new Date().toLocaleDateString()}\nFollow-up Required: None`,
        resolved_at: resolutionTime,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(resolvedTicket);
  TestValidator.equals(
    "ticket status should be resolved",
    resolvedTicket.status,
    "resolved",
  );
  TestValidator.predicate(
    "resolution notes should be comprehensive",
    resolvedTicket.resolution_notes !== undefined &&
      resolvedTicket.resolution_notes.length > 50,
  );
  TestValidator.equals(
    "resolved_at timestamp should match update",
    resolvedTicket.resolved_at,
    resolutionTime,
  );

  // Step 6: Update ticket status from 'resolved' to 'closed'
  const closedTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: createdTicket.id,
      body: {
        status: "closed",
        closed_at: new Date().toISOString(),
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(closedTicket);
  TestValidator.equals(
    "ticket status should be closed",
    closedTicket.status,
    "closed",
  );
  TestValidator.predicate(
    "closed_at timestamp should be set",
    closedTicket.closed_at !== undefined,
  );

  // Step 7: Validate final ticket state and audit trail
  TestValidator.equals(
    "ticket ID should remain consistent throughout lifecycle",
    closedTicket.id,
    createdTicket.id,
  );
  TestValidator.equals(
    "ticket number should remain consistent",
    closedTicket.ticket_number,
    createdTicket.ticket_number,
  );
  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    new Date(closedTicket.updated_at) > new Date(createdTicket.created_at),
  );
  TestValidator.predicate(
    "ticket should have proper audit trail with all status transitions recorded",
    closedTicket.status === "closed" &&
      closedTicket.resolved_at !== undefined &&
      closedTicket.closed_at !== undefined,
  );

  // Step 8: Test invalid status transition (should fail)
  await TestValidator.error(
    "should reject invalid status transition from closed back to open",
    async () => {
      await api.functional.shoppingMall.admin.supportTickets.update(
        connection,
        {
          ticketId: closedTicket.id,
          body: {
            status: "open", // Invalid: cannot reopen closed ticket
          } satisfies IShoppingMallSupportTicket.IUpdate,
        },
      );
    },
  );
}
