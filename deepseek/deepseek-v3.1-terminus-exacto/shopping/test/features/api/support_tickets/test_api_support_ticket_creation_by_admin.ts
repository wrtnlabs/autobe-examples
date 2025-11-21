import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test support ticket creation functionality for administrators.
 *
 * This E2E test validates that administrators can create new support tickets
 * with required fields including title, description, category, and priority.
 * The test verifies that the system automatically generates unique ticket
 * numbers and sets initial status to 'new'. It also tests optional inquiry
 * reference for ticket escalation scenarios and validates SLA deadline
 * calculation based on priority levels.
 */
export async function test_api_support_ticket_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({
        support_tickets: ["create", "read", "update"],
        inquiries: ["read"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a support ticket with required fields
  const ticketCategories = [
    "technical_issue",
    "billing_problem",
    "account_security",
    "product_question",
    "general_feedback",
  ] as const;
  const ticketPriorities = ["low", "medium", "high", "critical"] as const;

  const supportTicketData = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    category: RandomGenerator.pick(ticketCategories),
    priority: RandomGenerator.pick(ticketPriorities),
  } satisfies IShoppingMallSupportTicket.ICreate;

  const createdTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: supportTicketData,
    });
  typia.assert(createdTicket);

  // Step 3: Validate automatic system behaviors
  await TestValidator.equals(
    "ticket number is generated",
    typeof createdTicket.ticket_number,
    "string",
  );
  await TestValidator.predicate(
    "ticket number is not empty",
    createdTicket.ticket_number.length > 0,
  );
  await TestValidator.equals(
    "initial status is 'new'",
    createdTicket.status,
    "new",
  );
  await TestValidator.equals(
    "title matches input",
    createdTicket.title,
    supportTicketData.title,
  );
  await TestValidator.equals(
    "description matches input",
    createdTicket.description,
    supportTicketData.description,
  );
  await TestValidator.equals(
    "category matches input",
    createdTicket.category,
    supportTicketData.category,
  );
  await TestValidator.equals(
    "priority matches input",
    createdTicket.priority,
    supportTicketData.priority,
  );
  await TestValidator.predicate(
    "created_at timestamp is set",
    createdTicket.created_at !== null && createdTicket.created_at !== undefined,
  );

  // Step 4: Validate SLA deadline calculation based on priority
  if (
    createdTicket.priority === "critical" ||
    createdTicket.priority === "high"
  ) {
    await TestValidator.predicate(
      "high priority tickets have SLA deadline",
      createdTicket.sla_deadline !== null &&
        createdTicket.sla_deadline !== undefined,
    );
  }

  // Step 5: Test optional inquiry reference functionality
  const ticketWithInquiryData = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    category: RandomGenerator.pick(ticketCategories),
    priority: RandomGenerator.pick(ticketPriorities),
    shopping_mall_inquiry_id: undefined,
  } satisfies IShoppingMallSupportTicket.ICreate;

  const ticketWithoutInquiry =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: ticketWithInquiryData,
    });
  typia.assert(ticketWithoutInquiry);
  await TestValidator.equals(
    "ticket without inquiry reference created successfully",
    ticketWithoutInquiry.title,
    ticketWithInquiryData.title,
  );

  // Step 6: Validate administrator assignment
  await TestValidator.predicate(
    "administrator is assigned",
    createdTicket.assigned_administrator !== null &&
      createdTicket.assigned_administrator !== undefined,
  );
  if (createdTicket.assigned_administrator) {
    await TestValidator.equals(
      "assigned administrator matches authenticated admin",
      createdTicket.assigned_administrator.id,
      admin.administrator.id,
    );
    await TestValidator.equals(
      "assigned administrator email matches",
      createdTicket.assigned_administrator.email,
      admin.administrator.email,
    );
  }

  // Step 7: Test multiple ticket creation to verify uniqueness
  const anotherTicketData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category: RandomGenerator.pick(ticketCategories),
    priority: RandomGenerator.pick(ticketPriorities),
  } satisfies IShoppingMallSupportTicket.ICreate;

  const anotherTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: anotherTicketData,
    });
  typia.assert(anotherTicket);

  await TestValidator.notEquals(
    "ticket numbers are unique",
    createdTicket.ticket_number,
    anotherTicket.ticket_number,
  );
  await TestValidator.notEquals(
    "ticket IDs are unique",
    createdTicket.id,
    anotherTicket.id,
  );
}
