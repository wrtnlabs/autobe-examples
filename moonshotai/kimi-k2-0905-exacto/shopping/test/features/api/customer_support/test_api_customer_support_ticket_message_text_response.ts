import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import type { IShoppingMallTicketMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTicketMessage";

export async function test_api_customer_support_ticket_message_text_response(
  connection: api.IConnection,
) {
  // 1. Create customer and authenticate
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com/home",
      } satisfies IShoppingMallCustomer.IRegister,
    });
  typia.assert(customer);

  // 2. Create seller and product for order context
  await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(8),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });

  // Switch back to customer account
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "SecurePassword123!",
      href: "https://shoppingmall.com/login",
      referrer: "https://shoppingmall.com/register",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 3. Create support ticket with order context
  const ticket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.customer.supportTickets.create(
      connection,
      {
        body: {
          subject: `Order Issue - ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          priority: "medium",
          category: "order_issue",
          source: "portal",
          severity: "minor",
          related_order_id: null,
          href: "https://shoppingmall.com/support/tickets/create",
          referrer: "https://shoppingmall.com/orders/history",
          ip: null,
        } satisfies IShoppingMallSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 4. Add text message to ticket
  const messageContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });

  const message: IShoppingMallTicketMessage =
    await api.functional.shoppingMall.customer.supportTickets.messages.createMessage(
      connection,
      {
        ticketId: ticket.id,
        body: {
          message_content: messageContent,
          message_type: "text",
          attachments: null,
          metadata: null,
        } satisfies IShoppingMallTicketMessage.ICreate,
      },
    );
  typia.assert(message);

  // 5. Validate message properties
  TestValidator.equals(
    "message content matches",
    message.message_content,
    messageContent,
  );
  TestValidator.equals("message type is text", message.message_type, "text");
  TestValidator.equals(
    "message links to correct ticket",
    message.support_ticket?.id,
    ticket.id,
  );
  TestValidator.predicate(
    "message has sender attribution",
    message.sender_customer !== null,
  );
  TestValidator.equals(
    "message sender is current customer",
    message.sender_customer?.id,
    customer.id,
  );
  TestValidator.equals("message is not internal", message.is_internal, false);
  TestValidator.equals("message is not automated", message.is_automated, false);

  // 6. Validate timestamp properties
  TestValidator.predicate(
    "message has creation timestamp",
    message.created_at !== undefined,
  );
  TestValidator.predicate(
    "message has ISO datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(message.created_at),
  );

  // 7. Validate conversation context
  TestValidator.predicate(
    "message supports conversation threading",
    message.support_ticket !== undefined,
  );
  TestValidator.equals(
    "ticket number matches",
    message.support_ticket?.ticket_number,
    ticket.ticket_number,
  );
  TestValidator.equals(
    "ticket subject matches",
    message.support_ticket?.subject,
    ticket.subject,
  );

  // 8. Validate message content characteristics
  TestValidator.predicate(
    "message content has reasonable length",
    message.message_content.length > 50,
  );
  TestValidator.predicate(
    "message content has structure",
    message.message_content.includes("\n") === true,
  );
  TestValidator.predicate(
    "message content is readable text",
    message.message_content.trim().length > 0,
  );

  // 9. Test adding second message to verify chronological ordering
  const followUpMessage = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const secondMessage: IShoppingMallTicketMessage =
    await api.functional.shoppingMall.customer.supportTickets.messages.createMessage(
      connection,
      {
        ticketId: ticket.id,
        body: {
          message_content: followUpMessage,
          message_type: "text",
          attachments: null,
          metadata: null,
        } satisfies IShoppingMallTicketMessage.ICreate,
      },
    );
  typia.assert(secondMessage);

  // 10. Validate message thread continuity
  TestValidator.predicate(
    "second message created after first",
    new Date(secondMessage.created_at) >= new Date(message.created_at),
  );
  TestValidator.equals(
    "both messages belong to same ticket",
    secondMessage.support_ticket?.id,
    ticket.id,
  );
  TestValidator.equals(
    "second message sender is same customer",
    secondMessage.sender_customer?.id,
    customer.id,
  );
}
