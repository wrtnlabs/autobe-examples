import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test SLA deadline calculation based on different priority levels during
 * support ticket creation. Validates that critical priority tickets receive
 * immediate deadlines, high priority gets expedited timelines, medium priority
 * follows standard SLAs, and low priority has flexible deadlines. The test
 * verifies automatic deadline calculation, priority-based timeline assignment,
 * and proper SLA compliance tracking initialization.
 */
export async function test_api_support_ticket_creation_priority_sla_calculation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({
        support_tickets: ["create", "read", "update"],
        inquiries: ["read"],
      }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Define priority levels to test
  const priorities = ["critical", "high", "medium", "low"] as const;
  const categories = [
    "technical_issue",
    "billing_problem",
    "account_security",
    "product_question",
  ] as const;

  // Track tickets by priority
  const tickets: Record<string, IShoppingMallSupportTicket> = {};

  // Step 2: Create tickets with different priority levels
  for (const priority of priorities) {
    const ticketData = {
      title: `Support Ticket - ${priority} priority - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      description: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      category: RandomGenerator.pick(categories),
      priority: priority,
    } satisfies IShoppingMallSupportTicket.ICreate;

    const ticket =
      await api.functional.shoppingMall.admin.supportTickets.create(
        connection,
        { body: ticketData },
      );
    typia.assert(ticket);
    tickets[priority] = ticket;

    // Validate basic ticket properties
    TestValidator.equals(
      `ticket ${priority} priority matches creation data`,
      ticket.priority,
      priority,
    );
    TestValidator.equals(
      `ticket ${priority} title matches creation data`,
      ticket.title,
      ticketData.title,
    );
    TestValidator.equals(
      `ticket ${priority} description matches creation data`,
      ticket.description,
      ticketData.description,
    );
    TestValidator.equals(
      `ticket ${priority} category matches creation data`,
      ticket.category,
      ticketData.category,
    );
    TestValidator.predicate(
      `ticket ${priority} has valid ticket number format`,
      ticket.ticket_number.length > 0,
    );
    TestValidator.equals(
      `ticket ${priority} has correct initial status`,
      ticket.status,
      "new",
    );
    TestValidator.predicate(
      `ticket ${priority} has valid creation timestamp`,
      ticket.created_at.length > 0 &&
        !isNaN(new Date(ticket.created_at).getTime()),
    );
  }

  // Step 3: Validate SLA deadline calculations based on priority
  const currentTime = new Date();
  const ticketsWithDeadlines = Object.values(tickets).filter(
    (ticket) =>
      ticket.sla_deadline !== undefined && ticket.sla_deadline !== null,
  );

  TestValidator.predicate(
    "at least some tickets have SLA deadlines calculated",
    ticketsWithDeadlines.length > 0,
  );

  // Validate that SLA deadlines are properly formatted and in the future
  for (const ticket of ticketsWithDeadlines) {
    const slaDeadline = typia.assert(ticket.sla_deadline!);
    const deadlineDate = new Date(slaDeadline);
    const creationDate = new Date(ticket.created_at);

    TestValidator.predicate(
      `ticket ${ticket.priority} SLA deadline is valid ISO format`,
      !isNaN(deadlineDate.getTime()),
    );

    TestValidator.predicate(
      `ticket ${ticket.priority} SLA deadline is after creation time`,
      deadlineDate.getTime() > creationDate.getTime(),
    );

    TestValidator.predicate(
      `ticket ${ticket.priority} SLA deadline is in the future`,
      deadlineDate.getTime() > currentTime.getTime(),
    );
  }

  // Step 4: Validate SLA deadline ordering by priority (if multiple tickets have deadlines)
  if (ticketsWithDeadlines.length > 1) {
    const prioritizedDeadlines = ticketsWithDeadlines
      .map((ticket) => ({
        priority: ticket.priority,
        deadline: new Date(typia.assert(ticket.sla_deadline!)),
      }))
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    // Check that higher priority tickets generally have earlier deadlines
    const priorityWeights = { critical: 0, high: 1, medium: 2, low: 3 };

    TestValidator.predicate(
      "SLA deadlines generally follow priority importance",
      prioritizedDeadlines.every((item, index, array) => {
        if (index === 0) return true;
        const currentPriorityWeight =
          priorityWeights[item.priority as keyof typeof priorityWeights];
        const previousPriorityWeight =
          priorityWeights[
            array[index - 1].priority as keyof typeof priorityWeights
          ];
        return currentPriorityWeight >= previousPriorityWeight;
      }),
    );
  }

  // Step 5: Validate comprehensive ticket properties
  for (const priority of priorities) {
    const ticket = tickets[priority];

    TestValidator.predicate(
      `ticket ${priority} has valid UUID format ID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ticket.id,
      ),
    );

    TestValidator.predicate(
      `ticket ${priority} creation timestamp is before update timestamp`,
      new Date(ticket.created_at).getTime() <=
        new Date(ticket.updated_at).getTime(),
    );

    TestValidator.predicate(
      `ticket ${priority} has no resolution notes initially`,
      ticket.resolution_notes === undefined || ticket.resolution_notes === null,
    );

    TestValidator.predicate(
      `ticket ${priority} has no assigned administrator initially`,
      ticket.assigned_administrator === undefined ||
        ticket.assigned_administrator === null,
    );
  }

  // Step 6: Test business logic validation
  TestValidator.predicate(
    "all tickets have unique IDs",
    new Set(Object.values(tickets).map((t) => t.id)).size === priorities.length,
  );

  TestValidator.predicate(
    "all tickets have unique ticket numbers",
    new Set(Object.values(tickets).map((t) => t.ticket_number)).size ===
      priorities.length,
  );

  // Final validation that all API responses are properly structured
  for (const ticket of Object.values(tickets)) {
    typia.assert(ticket);
  }
}
