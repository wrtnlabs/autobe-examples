import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

export async function test_api_shopping_mall_seller_support_ticket_update_by_seller(
  connection: api.IConnection,
) {
  // Seller joins (registers new account)
  const sellerCreateBody = {
    email: `seller${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "TestPassword123!",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuthorized);

  // Admin joins and logs in to create seller registration
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: adminJoinBody.href,
      referrer: adminJoinBody.referrer,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Admin creates a seller registration
  const sellerRegistrationBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerRegistration: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      { body: sellerRegistrationBody },
    );
  typia.assert(sellerRegistration);

  // Seller login to create session
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password,
      ip: null,
      href: "https://seller.example.com/dashboard",
      referrer: "https://seller.example.com/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Create a session for the seller
  const sellerSessionCreateBody = {
    ip: null,
    href: "https://seller.example.com/dashboard",
    referrer: "https://seller.example.com/login",
    user_agent: "Mozilla/5.0 (Test Agent)",
    fingerprint: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSellerSession.ICreate;
  const sellerSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.create(
      connection,
      {
        shoppingMallSellerId: sellerRegistration.id,
        body: sellerSessionCreateBody,
      },
    );
  typia.assert(sellerSession);

  // Create a support ticket as seller
  const ticketCreateBody = {
    title: "Initial Ticket Title",
    description: "Initial ticket description with details.",
    status: "open",
  } satisfies IShoppingMallSupportTicket.ICreate;
  const supportTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.seller.shoppingMallSupportTickets.create(
      connection,
      { body: ticketCreateBody },
    );
  typia.assert(supportTicket);

  // Update the support ticket
  const ticketUpdateBody = {
    title: "Updated Ticket Title",
    description: "Updated description with new information.",
    status: "in_progress",
  } satisfies IShoppingMallSupportTicket.IUpdate;
  const updatedTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.seller.shoppingMallSupportTickets.update(
      connection,
      {
        shoppingMallSupportTicketId: supportTicket.id,
        body: ticketUpdateBody,
      },
    );
  typia.assert(updatedTicket);

  // Validate update fields
  TestValidator.equals(
    "Updated title should match",
    updatedTicket.title,
    ticketUpdateBody.title,
  );
  TestValidator.equals(
    "Updated description should match",
    updatedTicket.description,
    ticketUpdateBody.description,
  );
  TestValidator.equals(
    "Updated status should match",
    updatedTicket.status,
    ticketUpdateBody.status,
  );
}
