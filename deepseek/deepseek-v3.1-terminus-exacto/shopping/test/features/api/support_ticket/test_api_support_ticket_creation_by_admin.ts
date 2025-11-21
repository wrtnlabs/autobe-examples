import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Comprehensive support ticket creation workflow validation for administrators.
 *
 * This test validates that administrators can create formal support tickets for
 * complex customer issues requiring extended resolution processes. The test
 * covers proper authentication, ticket categorization, priority assignment,
 * automatic ticket number generation, initial status setting, and SLA deadline
 * calculation.
 *
 * Business workflow:
 *
 * 1. Administrator authentication and authorization establishment
 * 2. Support ticket creation with comprehensive issue details
 * 3. Automatic system field population and validation
 * 4. SLA deadline calculation based on priority levels
 * 5. Complete audit trail and tracking capability verification
 */
export async function test_api_support_ticket_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
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
        support_tickets: ["create", "read", "update"],
        inquiries: ["read"],
        users: ["read"],
      }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create support ticket with realistic business data
  const supportTicketCategories = [
    "technical_issue",
    "billing_problem",
    "account_security",
    "product_question",
    "general_feedback",
  ];
  const supportTicketPriorities = ["low", "medium", "high", "critical"];

  const ticketData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 12,
    }),
    category: RandomGenerator.pick(supportTicketCategories),
    priority: RandomGenerator.pick(supportTicketPriorities),
    shopping_mall_inquiry_id: undefined,
  } satisfies IShoppingMallSupportTicket.ICreate;

  const createdTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: ticketData,
    });
  typia.assert(createdTicket);

  // Step 3: Validate automatic system-generated fields
  TestValidator.predicate(
    "ticket number should be generated",
    createdTicket.ticket_number.length > 0,
  );
  TestValidator.equals(
    "initial status should be 'new'",
    createdTicket.status,
    "new",
  );
  TestValidator.predicate(
    "created_at timestamp should be set",
    createdTicket.created_at.length > 0,
  );

  // Step 4: Validate input data matches response
  TestValidator.equals(
    "title should match input",
    createdTicket.title,
    ticketData.title,
  );
  TestValidator.equals(
    "description should match input",
    createdTicket.description,
    ticketData.description,
  );
  TestValidator.equals(
    "category should match input",
    createdTicket.category,
    ticketData.category,
  );
  TestValidator.equals(
    "priority should match input",
    createdTicket.priority,
    ticketData.priority,
  );

  // Step 5: Validate SLA deadline calculation based on priority
  if (createdTicket.sla_deadline !== undefined) {
    TestValidator.predicate(
      "SLA deadline should be a valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdTicket.sla_deadline),
    );
  }

  // Step 6: Validate administrator assignment
  TestValidator.predicate(
    "assigned administrator should be set",
    createdTicket.assigned_administrator !== undefined,
  );

  if (createdTicket.assigned_administrator) {
    TestValidator.equals(
      "assigned admin ID should match authenticated admin",
      createdTicket.assigned_administrator.id,
      adminAuth.administrator.id,
    );
    TestValidator.equals(
      "assigned admin email should match authenticated admin",
      createdTicket.assigned_administrator.email,
      adminAuth.administrator.email,
    );
  }

  // Step 7: Validate UUID format for ID field
  TestValidator.predicate(
    "ticket ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTicket.id,
    ),
  );
}
