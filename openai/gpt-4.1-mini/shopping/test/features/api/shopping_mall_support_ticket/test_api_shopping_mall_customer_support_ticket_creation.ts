import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

export async function test_api_shopping_mall_customer_support_ticket_creation(
  connection: api.IConnection,
) {
  // 1. Register a new customer using auth customer join API
  const customerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Qwerty1234",
    href: "https://testsite.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    { body: customerCreateBody },
  );
  typia.assert(authorizedCustomer);

  // 2. Create a shopping mall customer for the authorized customer
  const customerCreateBody2 = {
    email: authorizedCustomer.email,
    password: "Qwerty1234",
    href: "https://testsite.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const shoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      { body: customerCreateBody2 },
    );
  typia.assert(shoppingMallCustomer);

  // 3. Create a customer session for context
  const sessionCreateBody = {
    ip: "203.0.113.42",
    href: "https://testsite.com/dashboard",
    referrer: "https://testsite.com/signup",
  } satisfies IShoppingMallCustomerSession.ICreate;
  const session =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: shoppingMallCustomer.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Submit a support ticket attributed to the authorized customer and session
  const supportTicketCreateBody = {
    title: "Issue: Cannot access account",
    description:
      "When I try to login, I receive an error message. Please help fix this issue promptly.",
    status: "open",
  } satisfies IShoppingMallSupportTicket.ICreate;
  const supportTicket =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.create(
      connection,
      { body: supportTicketCreateBody },
    );
  typia.assert(supportTicket);

  // 5. Validate that the support ticket has expected properties and correct linkage
  TestValidator.predicate(
    "support ticket has id",
    typeof supportTicket.id === "string" && supportTicket.id.length > 0,
  );
  TestValidator.equals(
    "support ticket title matches",
    supportTicket.title,
    supportTicketCreateBody.title,
  );
  TestValidator.equals(
    "support ticket status is open",
    supportTicket.status,
    "open",
  );
  TestValidator.equals(
    "support ticket description matches",
    supportTicket.description,
    supportTicketCreateBody.description,
  );

  // 6. Check the customer ID is linked and not null
  TestValidator.predicate(
    "support ticket linked to customer",
    supportTicket.shopping_mall_customer_id !== null &&
      supportTicket.shopping_mall_customer_id !== undefined,
  );
  TestValidator.equals(
    "support ticket customer ID matches created customer",
    supportTicket.shopping_mall_customer_id ?? "",
    shoppingMallCustomer.id,
  );

  // Note: The supportTicket does not necessarily include session id based on schema optionality, so cannot assert session id linkage here
}
