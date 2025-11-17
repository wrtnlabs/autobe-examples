import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

export async function test_api_shopping_mall_seller_support_ticket_creation(
  connection: api.IConnection,
) {
  // 1. Seller joins to create identity
  const sellerEmail = `${RandomGenerator.name(1)}@example.com`;
  const sellerJoinBody = {
    email: sellerEmail,
    password: "password123",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Admin joins to create admin identity for seller creation
  const adminEmail = `${RandomGenerator.name(1)}@example.admin`;
  const adminJoinBody = {
    email: adminEmail,
    password: "adminpass",
    ip: "127.0.0.1",
    href: "http://localhost/admin",
    referrer: "http://localhost/admin",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin logs in to create session context
  const adminLoginBody = {
    email: adminEmail,
    password: "adminpass",
    ip: "127.0.0.1",
    href: "http://localhost/admin",
    referrer: "http://localhost/admin",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 4. Admin creates the seller entity (with seller's email, password is hashed internally)
  const sellerCreateBody = {
    email: sellerEmail,
    password: "password123",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerEntity: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: sellerCreateBody,
      },
    );
  typia.assert(sellerEntity);

  // 5. Seller login to create seller authorization context
  const sellerLoginBody = {
    email: sellerEmail,
    password: "password123",
    ip: "127.0.0.1",
    href: "http://localhost/seller",
    referrer: "http://localhost/seller",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 6. Create seller session
  const sellerSessionCreateBody = {
    href: "http://localhost/seller/session",
    referrer: "http://localhost/home",
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0",
    fingerprint: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSellerSession.ICreate;
  const sellerSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.create(
      connection,
      {
        shoppingMallSellerId: sellerEntity.id,
        body: sellerSessionCreateBody,
      },
    );
  typia.assert(sellerSession);

  // 7. Create shopping mall support ticket as seller
  const supportTicketCreateBody = {
    title: "Test support ticket",
    description: "This is a test support ticket created during e2e test.",
    status: "open",
  } satisfies IShoppingMallSupportTicket.ICreate;
  const supportTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.seller.shoppingMallSupportTickets.create(
      connection,
      {
        body: supportTicketCreateBody,
      },
    );
  typia.assert(supportTicket);

  // Validate proper association
  TestValidator.predicate(
    "support ticket id exists",
    typeof supportTicket.id === "string" && supportTicket.id.length > 0,
  );
  TestValidator.equals(
    "support ticket title matches",
    supportTicket.title,
    supportTicketCreateBody.title,
  );
  TestValidator.equals(
    "support ticket description matches",
    supportTicket.description,
    supportTicketCreateBody.description,
  );
  TestValidator.equals(
    "support ticket status is open",
    supportTicket.status,
    "open",
  );
  TestValidator.equals(
    "support ticket sellerId matches",
    supportTicket.shopping_mall_seller_id,
    sellerEntity.id,
  );
  TestValidator.equals(
    "support ticket session id matches session created",
    supportTicket.shopping_mall_seller_session_id,
    sellerSession.id,
  );
}
