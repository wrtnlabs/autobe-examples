import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_customer_session_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongP@ssw0rd123",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user login
  const adminLoginBody = {
    email: adminEmail,
    password: "StrongP@ssw0rd123",
    ip: null,
    href: "https://admin.shoppingmall.example.com/dashboard",
    referrer: "https://admin.shoppingmall.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminIdentified: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminIdentified);

  // 3. Perform paginated search for customer sessions filtered by IP and referrer
  // Use exact request with typical pagination values and some filter string
  const searchRequestBody: IShoppingMallCustomerSession.IRequest = {
    page: 1,
    limit: 20,
    filter_ip: "192.168.",
    filter_referrer: "example.com",
    filter_valid: true,
    sort_by: "created_at",
    sort_order: "desc",
  };

  const pageResult: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customerSessions.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is within 1 to 100",
    pageResult.pagination.limit >= 1 && pageResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records does not exceed total pages times limit",
    pageResult.pagination.records <=
      pageResult.pagination.pages * pageResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages equals ceiling of records/limit",
    pageResult.pagination.pages,
    Math.ceil(pageResult.pagination.records / pageResult.pagination.limit),
  );

  // 5. Validate each session in data
  for (const session of pageResult.data) {
    typia.assert(session);

    // Validate IP contains filter substring if filter_ip is set
    if (
      searchRequestBody.filter_ip !== null &&
      searchRequestBody.filter_ip !== undefined
    ) {
      TestValidator.predicate(
        `session IP contains filter '${searchRequestBody.filter_ip}'`,
        session.ip.includes(searchRequestBody.filter_ip),
      );
    }

    // Validate referrer contains filter substring if filter_referrer is set
    if (
      searchRequestBody.filter_referrer !== null &&
      searchRequestBody.filter_referrer !== undefined
    ) {
      TestValidator.predicate(
        `session referrer contains filter '${searchRequestBody.filter_referrer}'`,
        session.referrer.includes(searchRequestBody.filter_referrer),
      );
    }

    // Validate created_at timestamp format via typia.assert
    typia.assert<string & tags.Format<"date-time">>(session.created_at);

    // Validate each session's customer id is non-empty string UUID
    typia.assert<string & tags.Format<"uuid">>(
      session.shopping_mall_customer_id,
    );
  }

  // 6. Edge case: search with filters that result in empty data
  const emptySearchRequestBody: IShoppingMallCustomerSession.IRequest = {
    page: 1,
    limit: 20,
    filter_ip: "nonexistent_ip_abc",
    filter_referrer: "nonexistent_referrer_xyz",
    filter_valid: true,
  };

  const emptyPageResult: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customerSessions.index(connection, {
      body: emptySearchRequestBody,
    });
  typia.assert(emptyPageResult);

  TestValidator.equals(
    "empty result data array length",
    emptyPageResult.data.length,
    0,
  );

  // 7. Edge case: pagination with maximum limit and page
  const maxLimitRequestBody: IShoppingMallCustomerSession.IRequest = {
    page: 10,
    limit: 100,
  };

  const maxLimitResult: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customerSessions.index(connection, {
      body: maxLimitRequestBody,
    });
  typia.assert(maxLimitResult);

  TestValidator.predicate(
    "pagination current page is 10",
    maxLimitResult.pagination.current === 10,
  );

  TestValidator.predicate(
    "pagination limit does not exceed 100",
    maxLimitResult.pagination.limit <= 100,
  );
}
