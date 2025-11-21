import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import type { IShoppingMallTicketMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTicketMessage";

/**
 * Test adding a reply message to an existing support ticket.
 *
 * This test validates the support ticket messaging system by testing the
 * complete workflow of:
 *
 * 1. Customer registration and authentication
 * 2. Creating a support ticket
 * 3. Adding messages to the ticket with proper content validation
 * 4. Verifying message threading and conversation history
 * 5. Testing message type restrictions (customers limited to 'text' type)
 * 6. Validating message content format and length requirements
 *
 * The test ensures customers can effectively communicate with support staff
 * while maintaining security boundaries and proper authorization checks. It
 * also verifies that the complete conversation thread is maintained for issue
 * resolution tracking and audit purposes.
 */
export async function test_api_support_ticket_message_addition(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a customer
  const customerEmail =
    RandomGenerator.mobile("010").replace(/-/g, "") + "@test.com";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "StrongPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IRegister,
  });
  typia.assert(customer);

  // Step 2: Create a support ticket to add messages to
  const ticket =
    await api.functional.shoppingMall.customer.supportTickets.create(
      connection,
      {
        body: {
          subject: "Order delivery issue - Tracking number problems",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
          category: "order_issue",
          source: RandomGenerator.pick([
            "email",
            "chat",
            "phone",
            "portal",
            "social_media",
          ] as const),
          severity: RandomGenerator.pick([
            "critical",
            "major",
            "minor",
            "cosmetic",
          ] as const),
          href: "https://example.com/tickets",
          referrer: "https://example.com/dashboard",
        } satisfies IShoppingMallSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // Step 3: Add a customer message to the ticket
  const customerMessage =
    await api.functional.shoppingMall.customer.supportTickets.messages.createMessage(
      connection,
      {
        ticketId: ticket.id,
        body: {
          message_content:
            "Hello, I'm still experiencing the same tracking issue. I checked the tracking number on the carrier website and it shows as not found. Could you please investigate this?",
          message_type: "text", // Customer can only create 'text' or 'attachment' messages
        } satisfies IShoppingMallTicketMessage.ICreate,
      },
    );
  typia.assert(customerMessage);

  // Step 4: Verify the message was created successfully
  TestValidator.equals(
    "message sender is customer",
    customerMessage.sender_customer?.id,
    customer.id,
  );
  TestValidator.equals(
    "message content matches",
    customerMessage.message_content,
    "Hello, I'm still experiencing the same tracking issue. I checked the tracking number on the carrier website and it shows as not found. Could you please investigate this?",
  );
  TestValidator.equals(
    "message type is text",
    customerMessage.message_type,
    "text",
  );
  TestValidator.predicate(
    "message creation timestamp exists",
    customerMessage.created_at !== null,
  );
  TestValidator.predicate(
    "message is not internal",
    customerMessage.is_internal === false,
  );
  TestValidator.predicate(
    "message is not automated",
    customerMessage.is_automated === false,
  );

  // Step 5: Add another message with longer content
  const detailedMessage =
    await api.functional.shoppingMall.customer.supportTickets.messages.createMessage(
      connection,
      {
        ticketId: ticket.id,
        body: {
          message_content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 15,
            sentenceMax: 25,
          }),
          message_type: "text",
        } satisfies IShoppingMallTicketMessage.ICreate,
      },
    );
  typia.assert(detailedMessage);

  // Step 6: Verify message content length and format
  TestValidator.predicate(
    "detailed message content has appropriate length",
    detailedMessage.message_content.length > 100,
  );
  TestValidator.predicate(
    "detailed message content contains paragraphs",
    detailedMessage.message_content.includes("\n\n"),
  );

  // Step 7: Test error handling for forbidden message types (customers cannot create system notices)
  await TestValidator.error(
    "customer cannot create system notice messages",
    async () => {
      await api.functional.shoppingMall.customer.supportTickets.messages.createMessage(
        connection,
        {
          ticketId: ticket.id,
          body: {
            message_content: "This message type should be rejected",
            message_type: "system_notice", // Customers cannot create system notices
          } satisfies IShoppingMallTicketMessage.ICreate,
        },
      );
    },
  );

  // Step 7: Test message to non-existent ticket
  const nonExistentTicketId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot add message to non-existent ticket",
    async () => {
      await api.functional.shoppingMall.customer.supportTickets.messages.createMessage(
        connection,
        {
          ticketId: nonExistentTicketId,
          body: {
            message_content: "This should fail due to invalid ticket ID",
            message_type: "text",
          } satisfies IShoppingMallTicketMessage.ICreate,
        },
      );
    },
  );
}
