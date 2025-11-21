import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test partial updates to support ticket fields without requiring complete
 * record replacement. Validates that administrators can modify specific ticket
 * attributes independently, such as updating only the description, changing
 * only the category, or adjusting only the priority. The test verifies
 * field-level update validation, partial update functionality, audit trail for
 * individual field changes, and proper isolation of modified fields from
 * unchanged ones.
 */
export async function test_api_support_ticket_partial_field_update(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        support_tickets: ["read", "write", "update"],
        inquiries: ["read"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial support ticket
  const initialTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category: "technical_issue",
        priority: "medium",
      } satisfies IShoppingMallSupportTicket.ICreate,
    });
  typia.assert(initialTicket);

  // Step 3: Test partial update - title only
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const titleOnlyUpdate =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        title: updatedTitle,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(titleOnlyUpdate);

  // Validate title was updated, other fields remain unchanged
  TestValidator.equals(
    "title should be updated",
    titleOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should remain unchanged",
    titleOnlyUpdate.description,
    initialTicket.description,
  );
  TestValidator.equals(
    "category should remain unchanged",
    titleOnlyUpdate.category,
    initialTicket.category,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    titleOnlyUpdate.priority,
    initialTicket.priority,
  );

  // Step 4: Test partial update - description only
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const descriptionOnlyUpdate =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        description: updatedDescription,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(descriptionOnlyUpdate);

  // Validate description was updated, other fields remain unchanged
  TestValidator.equals(
    "title should remain unchanged from previous update",
    descriptionOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should be updated",
    descriptionOnlyUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category should remain unchanged",
    descriptionOnlyUpdate.category,
    initialTicket.category,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    descriptionOnlyUpdate.priority,
    initialTicket.priority,
  );

  // Step 5: Test partial update - category only
  const updatedCategory = "billing_problem";
  const categoryOnlyUpdate =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        category: updatedCategory,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(categoryOnlyUpdate);

  // Validate category was updated, other fields remain unchanged
  TestValidator.equals(
    "title should remain unchanged",
    categoryOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should remain unchanged",
    categoryOnlyUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category should be updated",
    categoryOnlyUpdate.category,
    updatedCategory,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    categoryOnlyUpdate.priority,
    initialTicket.priority,
  );

  // Step 6: Test partial update - priority only
  const updatedPriority = "high";
  const priorityOnlyUpdate =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        priority: updatedPriority,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(priorityOnlyUpdate);

  // Validate priority was updated, other fields remain unchanged
  TestValidator.equals(
    "title should remain unchanged",
    priorityOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should remain unchanged",
    priorityOnlyUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category should remain unchanged",
    priorityOnlyUpdate.category,
    updatedCategory,
  );
  TestValidator.equals(
    "priority should be updated",
    priorityOnlyUpdate.priority,
    updatedPriority,
  );

  // Step 7: Test audit trail by checking updated_at timestamp changes
  TestValidator.predicate(
    "updated_at should be newer after modifications",
    new Date(priorityOnlyUpdate.updated_at) >
      new Date(initialTicket.updated_at),
  );

  // Step 8: Test empty update (should succeed but change nothing)
  const emptyUpdate =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {} satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(emptyUpdate);

  // Validate no fields changed with empty update
  TestValidator.equals(
    "title should remain unchanged after empty update",
    emptyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should remain unchanged after empty update",
    emptyUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category should remain unchanged after empty update",
    emptyUpdate.category,
    updatedCategory,
  );
  TestValidator.equals(
    "priority should remain unchanged after empty update",
    emptyUpdate.priority,
    updatedPriority,
  );

  // Step 9: Test field isolation with multiple simultaneous updates
  const finalTitle = RandomGenerator.paragraph({ sentences: 5 });
  const finalDescription = RandomGenerator.content({ paragraphs: 4 });
  const finalCategory = "account_security";
  const finalPriority = "critical";

  const comprehensiveUpdate =
    await api.functional.shoppingMall.admin.supportTickets.update(connection, {
      ticketId: initialTicket.id,
      body: {
        title: finalTitle,
        description: finalDescription,
        category: finalCategory,
        priority: finalPriority,
      } satisfies IShoppingMallSupportTicket.IUpdate,
    });
  typia.assert(comprehensiveUpdate);

  // Validate all fields updated correctly
  TestValidator.equals(
    "comprehensive update - title",
    comprehensiveUpdate.title,
    finalTitle,
  );
  TestValidator.equals(
    "comprehensive update - description",
    comprehensiveUpdate.description,
    finalDescription,
  );
  TestValidator.equals(
    "comprehensive update - category",
    comprehensiveUpdate.category,
    finalCategory,
  );
  TestValidator.equals(
    "comprehensive update - priority",
    comprehensiveUpdate.priority,
    finalPriority,
  );
}
