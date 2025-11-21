import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test support ticket creation that escalates from an existing customer
 * inquiry. Validates the optional inquiry reference functionality where support
 * tickets can be linked to original customer inquiries for complete audit
 * trail.
 */
export async function test_api_support_ticket_creation_with_inquiry_reference(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create customer inquiry
  const customerInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        inquiry_type: "technical_support",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(customerInquiry);

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_create_tickets: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 5: Create support ticket with inquiry reference
  const supportTicket =
    await api.functional.shoppingMall.admin.supportTickets.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category: "technical_issue",
        priority: "high",
        shopping_mall_inquiry_id: customerInquiry.id,
      } satisfies IShoppingMallSupportTicket.ICreate,
    });
  typia.assert(supportTicket);

  // Step 6: Validate inquiry reference linkage
  TestValidator.equals(
    "support ticket should reference the customer inquiry",
    supportTicket.shopping_mall_inquiry_id,
    customerInquiry.id,
  );

  TestValidator.equals(
    "support ticket should have correct category",
    supportTicket.category,
    "technical_issue",
  );

  TestValidator.equals(
    "support ticket should have correct priority",
    supportTicket.priority,
    "high",
  );

  TestValidator.predicate(
    "support ticket should have a valid ticket number",
    supportTicket.ticket_number.length > 0,
  );

  TestValidator.predicate(
    "support ticket should be in initial status",
    supportTicket.status === "new" || supportTicket.status === "open",
  );

  TestValidator.predicate(
    "support ticket should have creation timestamp",
    supportTicket.created_at.length > 0,
  );

  TestValidator.predicate(
    "support ticket description should match input",
    supportTicket.description.length > 0,
  );
}
