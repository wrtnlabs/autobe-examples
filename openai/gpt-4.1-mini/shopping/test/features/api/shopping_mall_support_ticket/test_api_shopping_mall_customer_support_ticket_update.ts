import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

export async function test_api_shopping_mall_customer_support_ticket_update(
  connection: api.IConnection,
) {
  // 1. Authenticate customer with join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(authorizedCustomer);

  // 2. Create shopping mall customer
  const createCustomerBody = {
    email: authorizedCustomer.email,
    password: joinBody.password,
    href: joinBody.href,
    referrer: joinBody.referrer,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      { body: createCustomerBody },
    );
  typia.assert(customer);

  // 3. Create customer session for session context
  const createSessionBody = {
    ip: "192.168.0.1",
    href: "https://example.com/dashboard",
    referrer: "https://google.com",
    device_info: "Test Device",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  } satisfies IShoppingMallCustomerSession.ICreate;
  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: customer.id,
        body: createSessionBody,
      },
    );
  typia.assert(session);

  // 4. Create a support ticket
  const createTicketBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "open",
  } satisfies IShoppingMallSupportTicket.ICreate;
  const supportTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.create(
      connection,
      { body: createTicketBody },
    );
  typia.assert(supportTicket);

  // 5. Update the support ticket
  const updateTicketBody = {
    title: "Updated: " + createTicketBody.title,
    description: createTicketBody.description + " Updated details.",
    status: "in_progress",
  } satisfies IShoppingMallSupportTicket.IUpdate;
  const updatedTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.update(
      connection,
      {
        shoppingMallSupportTicketId: supportTicket.id,
        body: updateTicketBody,
      },
    );
  typia.assert(updatedTicket);

  // 6. Verify updated fields
  TestValidator.equals(
    "support ticket title updated",
    updatedTicket.title,
    updateTicketBody.title,
  );
  TestValidator.equals(
    "support ticket description updated",
    updatedTicket.description,
    updateTicketBody.description,
  );
  TestValidator.equals(
    "support ticket status updated",
    updatedTicket.status,
    updateTicketBody.status,
  );

  // 7. Verify authorization (implied by success of update with proper customer context)
}
