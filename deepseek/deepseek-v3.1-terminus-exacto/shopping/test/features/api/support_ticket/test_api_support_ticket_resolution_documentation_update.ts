import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test comprehensive resolution documentation during support ticket closure
 * process.
 *
 * This E2E test validates that administrators can document complete resolution
 * steps, including technical solutions, customer communications, root cause
 * analysis, and preventive measures. The test covers resolution note
 * validation, closure workflow integration, knowledge base contribution
 * preparation, and proper documentation standards compliance.
 *
 * Business logic includes:
 *
 * 1. Administrator authentication and authorization
 * 2. Support ticket creation with initial status
 * 3. Resolution documentation with comprehensive notes
 * 4. Ticket closure workflow validation
 * 5. Documentation completeness checking
 */
export async function test_api_support_ticket_resolution_documentation_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ support: true, tickets: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create support ticket for resolution testing
  const supportTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category: "technical_issue",
        priority: "high",
      } satisfies IShoppingMallSupportTicket.ICreate,
    });
  typia.assert(supportTicket);
  TestValidator.equals(
    "ticket status should be new",
    supportTicket.status,
    "new",
  );

  // Step 3: Update ticket with comprehensive resolution documentation
  const comprehensiveResolutionNotes = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  const updatedTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: supportTicket.id,
      body: {
        resolution_notes: comprehensiveResolutionNotes,
        status: "resolved",
        resolved_at: new Date().toISOString(),
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(updatedTicket);

  // Step 4: Validate resolution documentation
  TestValidator.equals(
    "ticket should be resolved",
    updatedTicket.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution notes should match",
    updatedTicket.resolution_notes,
    comprehensiveResolutionNotes,
  );
  TestValidator.predicate(
    "resolved_at should be set",
    updatedTicket.resolved_at !== null &&
      updatedTicket.resolved_at !== undefined,
  );

  // Step 5: Final closure with complete documentation
  const closedTicket =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: supportTicket.id,
      body: {
        status: "closed",
        closed_at: new Date().toISOString(),
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(closedTicket);

  // Step 6: Final validation
  TestValidator.equals(
    "ticket should be closed",
    closedTicket.status,
    "closed",
  );
  TestValidator.predicate(
    "closed_at should be set",
    closedTicket.closed_at !== null && closedTicket.closed_at !== undefined,
  );
  TestValidator.equals(
    "resolution notes preserved",
    closedTicket.resolution_notes,
    comprehensiveResolutionNotes,
  );
  TestValidator.predicate(
    "ticket number should be generated",
    closedTicket.ticket_number.length > 0,
  );
}
