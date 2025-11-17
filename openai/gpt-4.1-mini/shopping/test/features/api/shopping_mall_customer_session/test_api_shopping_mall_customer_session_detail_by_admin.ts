import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_shopping_mall_customer_session_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin1234",
        ip: "127.0.0.1",
        href: "https://example.com/admin/join",
        referrer: "https://example.com/login",
      } satisfies IShoppingMallAdmin.IJoin,
    });

  typia.assert(admin);

  // 2. Create a shopping mall customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBody = {
    email: customerEmail,
    password: "customerpass",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: customerBody,
      },
    );

  typia.assert(customer);

  // 3. Create a shopping mall customer session for the created customer
  const sessionBody = {
    ip: "192.168.1.100",
    href: "https://example.com/customer/session",
    referrer: "https://example.com/home",
    expired_at: null,
    is_active: true,
    device_info: "Test Device",
    user_agent: "Mozilla/5.0 (compatible; TestBot/1.0)",
  } satisfies IShoppingMallCustomerSession.ICreate;

  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: customer.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 4. Admin retrieves the detailed shopping mall customer session
  const sessionDetail: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.shoppingMallCustomers.shoppingMallCustomerSessions.at(
      connection,
      {
        shoppingMallCustomerId: customer.id,
        shoppingMallCustomerSessionId: session.id,
      },
    );
  typia.assert(sessionDetail);

  // 5. Validate retrieved data
  TestValidator.equals(
    "admin retrieved session id matches created",
    sessionDetail.id,
    session.id,
  );
  TestValidator.equals(
    "admin retrieved session customer id matches created customer",
    sessionDetail.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "sessionDetail.ip matches",
    sessionDetail.ip,
    sessionBody.ip,
  );
  TestValidator.equals(
    "sessionDetail.href matches",
    sessionDetail.href,
    sessionBody.href,
  );
  TestValidator.equals(
    "sessionDetail.referrer matches",
    sessionDetail.referrer,
    sessionBody.referrer,
  );
  TestValidator.equals(
    "sessionDetail.expired_at matches",
    sessionDetail.expired_at,
    sessionBody.expired_at,
  );
  TestValidator.equals(
    "sessionDetail.is_active matches",
    sessionDetail.is_active,
    sessionBody.is_active,
  );
  TestValidator.equals(
    "sessionDetail.device_info matches",
    sessionDetail.device_info,
    sessionBody.device_info,
  );
  TestValidator.equals(
    "sessionDetail.user_agent matches",
    sessionDetail.user_agent,
    sessionBody.user_agent,
  );
}
