import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_shopping_mall_admin_customer_sessions_listing(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: adminName,
        password: adminPassword,
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer creation
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerFullName: string = RandomGenerator.name();

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password: "UserPass123!",
        full_name: customerFullName,
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Request customer sessions list by admin
  const requestBody: IShoppingMallCustomerSession.IRequest = {
    page: 1,
    limit: 10,
    search_term: undefined,
    sort_by: "login_time",
    order: "desc",
  };

  const pageResult: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.customerSessions.index(
      connection,
      {
        customerId: typia.assert<string & tags.Format<"uuid">>(customer.id),
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 10",
    pageResult.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination pages is positive",
    pageResult.pagination.pages === 0 || pageResult.pagination.pages >= 1,
  );

  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );

  // 5. Validate each session summary entries
  for (const session of pageResult.data) {
    typia.assert<IShoppingMallCustomerSession.ISummary>(session);
    TestValidator.predicate(
      "session id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        session.id,
      ),
    );
    TestValidator.equals(
      "session customerId matches",
      session.shopping_mall_customer_id,
      customer.id,
    );
    TestValidator.predicate(
      "session ip is defined",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session href is defined",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is defined",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at is ISO string",
      !isNaN(Date.parse(session.created_at)),
    );
    // expired_at can be null or string
    TestValidator.predicate(
      "session expired_at is null or ISO string",
      session.expired_at === null ||
        session.expired_at === undefined ||
        !isNaN(Date.parse(session.expired_at ?? "")),
    );
  }
}
