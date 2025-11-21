import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test the complete support ticket deletion workflow where an administrator
 * creates a support ticket and then permanently deletes it. This scenario
 * validates the hard deletion functionality for support tickets, ensuring
 * proper authorization checks and complete removal of ticket records from the
 * system.
 */
export async function test_api_support_ticket_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
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
        can_delete_tickets: true,
        can_manage_support: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a support ticket that will be deleted
  const supportTicket =
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
        priority: "high",
        shopping_mall_inquiry_id: undefined,
      } satisfies IShoppingMallSupportTicket.ICreate,
    });
  typia.assert(supportTicket);

  // Step 3: Delete the support ticket permanently
  const deletedTicket =
    await api.functional.shoppingMall.admin.supportTickets.erase(connection, {
      ticketId: supportTicket.id,
    });
  typia.assert(deletedTicket);

  // Step 4: Validate deletion was successful
  TestValidator.equals(
    "deleted ticket ID matches created ticket ID",
    deletedTicket.id,
    supportTicket.id,
  );
  TestValidator.equals(
    "deleted ticket title matches created ticket title",
    deletedTicket.title,
    supportTicket.title,
  );
  TestValidator.equals(
    "deleted ticket description matches created ticket description",
    deletedTicket.description,
    supportTicket.description,
  );

  // Step 5: Verify the ticket no longer exists by attempting to delete it again (should fail)
  await TestValidator.error(
    "deleting non-existent ticket should fail",
    async () => {
      await api.functional.shoppingMall.admin.supportTickets.erase(connection, {
        ticketId: supportTicket.id,
      });
    },
  );
}
