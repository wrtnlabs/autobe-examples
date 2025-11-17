import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";

export async function test_api_shopping_mall_support_ticket_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin1234!",
        href: "https://admin.platform.test/join",
        referrer: "https://admin.platform.test",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin login to authenticate
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin1234!",
      href: "https://admin.platform.test/login",
      referrer: "https://admin.platform.test",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Customer1234!",
        href: "https://customer.platform.test/join",
        referrer: "https://customer.platform.test",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "Customer1234!",
      href: "https://customer.platform.test/login",
      referrer: "https://customer.platform.test",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Create customer session
  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: customer.id,
        body: {
          ip: "192.168.1.100",
          href: "https://customer.platform.test/dashboard",
          referrer: "https://customer.platform.test/login",
          is_active: true,
          device_info: "Chrome Windows",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        } satisfies IShoppingMallCustomerSession.ICreate,
      },
    );
  typia.assert(session);

  // 6. Create support ticket for customer
  const ticketTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const ticketDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const supportTicket: IShoppingMallSupportTicket =
    await api.functional.shoppingMall.customer.shoppingMallSupportTickets.create(
      connection,
      {
        body: {
          title: ticketTitle,
          description: ticketDescription,
          status: "open",
        } satisfies IShoppingMallSupportTicket.ICreate,
      },
    );
  typia.assert(supportTicket);

  // 7. Admin deletes the created support ticket
  await api.functional.shoppingMall.admin.shoppingMallSupportTickets.erase(
    connection,
    {
      shoppingMallSupportTicketId: supportTicket.id,
    },
  );

  // No direct API to verify deletion, so at least confirm no errors thrown and flow completes
}
