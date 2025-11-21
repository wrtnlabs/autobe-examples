import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test detailed support ticket retrieval functionality for administrators.
 *
 * This test validates that administrators can access complete ticket
 * information including ticket number, title, description, category, priority,
 * status, SLA deadlines, resolution notes, and timestamps. It ensures proper
 * access control and data integrity throughout the retrieval process.
 */
export async function test_api_support_ticket_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ support_tickets: ["read", "write"] }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a test support ticket
  const supportTicketData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    category: "technical_issue",
    priority: "high",
    shopping_mall_inquiry_id: undefined,
  } satisfies IShoppingMallSupportTicket.ICreate;

  const createdTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: supportTicketData,
    });
  typia.assert(createdTicket);

  // Step 3: Retrieve the created ticket
  const retrievedTicket =
    await api.functional.shoppingMall.admin.supportTickets.at(connection, {
      ticketId: createdTicket.id,
    });
  typia.assert(retrievedTicket);

  // Step 4: Validate retrieved ticket data
  TestValidator.equals(
    "ticket ID matches",
    retrievedTicket.id,
    createdTicket.id,
  );
  TestValidator.equals(
    "ticket title matches",
    retrievedTicket.title,
    supportTicketData.title,
  );
  TestValidator.equals(
    "ticket description matches",
    retrievedTicket.description,
    supportTicketData.description,
  );
  TestValidator.equals(
    "ticket category matches",
    retrievedTicket.category,
    supportTicketData.category,
  );
  TestValidator.equals(
    "ticket priority matches",
    retrievedTicket.priority,
    supportTicketData.priority,
  );
  TestValidator.equals(
    "ticket status should be 'new'",
    retrievedTicket.status,
    "new",
  );
  TestValidator.predicate(
    "ticket number should be generated",
    retrievedTicket.ticket_number.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp should be set",
    retrievedTicket.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    retrievedTicket.updated_at.length > 0,
  );
  TestValidator.equals(
    "inquiry reference should be null",
    retrievedTicket.shopping_mall_inquiry_id,
    undefined,
  );
  TestValidator.equals(
    "assigned administrator should be null",
    retrievedTicket.shopping_mall_administrator_id,
    undefined,
  );
}
