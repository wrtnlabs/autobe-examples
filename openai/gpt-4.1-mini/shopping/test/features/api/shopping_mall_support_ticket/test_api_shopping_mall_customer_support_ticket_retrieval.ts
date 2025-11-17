import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

/**
 * Test retrieval of a specific shopping mall support ticket by its ID by an
 * authenticated customer.
 *
 * The test involves multiple steps to ensure full business context and
 * authorization validity.
 *
 * Step 1: Register a new customer using the auth customer join API. This will
 * generate an authenticated customer session and JWT token. Validate the
 * returned object is the authorized form with id, email, and token.
 *
 * Step 2: Create a session for the new customer using the customer id from Step
 *
 * 1. Supply realistic connection info such as IP, href, referrer, device info, and
 *    user agent. Validate the session object returned.
 *
 * Step 3: Using the authenticated customer context (Step 1), create a support
 * ticket attributed to this customer. Supply title, description, and initial
 * status 'open'. Validate the returned support ticket contains expected fields
 * including id matching UUID format and correct status.
 *
 * Step 4: Retrieve the support ticket by its id using the 'at' API. Validate
 * the returned ticket matches the created ticket's data, including title,
 * description, status, and linked customer id fields.
 *
 * All API responses must be validated with typia.assert. All business
 * validation checks (e.g. id equality, status match) must be done with
 * TestValidator.equals with descriptive titles. Authentication token and
 * session are handled automatically by the SDK.
 *
 * This tests the full retrieval flow of a customer support ticket by an
 * authenticated customer including creation and subsequent retrieval, verifying
 * authorization and data consistency.
 */
export async function test_api_shopping_mall_customer_support_ticket_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer using the auth customer join API
  const customerCredentialEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerCredentialEmail,
        password: "1234",
        href: "https://example.com/join",
        referrer: "https://referrer.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a session for the new customer
  const sessionBody = {
    ip: "192.168.0.1",
    href: "https://example.com/session",
    referrer: "https://referrer.example.com/session",
    device_info: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  } satisfies IShoppingMallCustomerSession.ICreate;

  const newSession: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: authorizedCustomer.id,
        body: sessionBody,
      },
    );
  typia.assert(newSession);

  // 3. Create a support ticket attributed to the authenticated customer
  const ticketCreateBody = {
    title: "Product issue - test",
    description: "The product I received is defective.",
    status: "open",
  } satisfies IShoppingMallSupportTicket.ICreate;

  const createdTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.create(
      connection,
      {
        body: ticketCreateBody,
      },
    );
  typia.assert(createdTicket);

  // 4. Retrieve the support ticket by ID
  const retrievedTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.at(
      connection,
      {
        shoppingMallSupportTicketId: createdTicket.id,
      },
    );
  typia.assert(retrievedTicket);

  // Business validations
  TestValidator.equals(
    "Created ticket ID matches retrieved",
    retrievedTicket.id,
    createdTicket.id,
  );
  TestValidator.equals(
    "Created ticket title matches retrieved",
    retrievedTicket.title,
    createdTicket.title,
  );
  TestValidator.equals(
    "Created ticket description matches retrieved",
    retrievedTicket.description,
    createdTicket.description,
  );
  TestValidator.equals(
    "Created ticket status matches retrieved",
    retrievedTicket.status,
    createdTicket.status,
  );
  // Validate customer ID linkage
  TestValidator.equals(
    "Customer ID linkage Check",
    retrievedTicket.shopping_mall_customer_id,
    authorizedCustomer.id,
  );
}
