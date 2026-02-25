import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_listing_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario verifies that an authorized administrator can retrieve a paginated and filtered list of customer sessions with various filters and pagination parameters.
  // 1. Administrator joins
  const adminConnectionForJoin: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnectionForJoin, {
    body: { password: "12345678" },
  });
  typia.assert(admin);
  // 2. Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: "12345678",
    },
  });
  // 3. Customer joins
  const customerConnectionForJoin: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnectionForJoin, {
    body: { password: "secretpassword" },
  });
  typia.assert(customer);
  // 4. Customer login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "secretpassword",
    },
  });
  // 5. Admin retrieves sessions with no filters (page 1, default limit)
  const noFilterResponse =
    await api.functional.shoppingMall.customer.sessions.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(noFilterResponse);
  // Test pagination metadata validity
  TestValidator.predicate(
    "pagination current is positive",
    noFilterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive and <= 100",
    noFilterResponse.pagination.limit >= 1 &&
      noFilterResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    noFilterResponse.pagination.pages >= 0,
  );
  // Test sessions returned are sorted by createdAt descending
  for (let i = 1; i < noFilterResponse.data.length; i++) {
    TestValidator.predicate(
      `sessions is descending by createdAt between index ${i - 1} and ${i}`,
      noFilterResponse.data[i - 1].createdAt >=
        noFilterResponse.data[i].createdAt,
    );
  }
  // 6. Admin retrieves sessions filtered by customer ID
  const filterByCustomerIdResponse =
    await api.functional.shoppingMall.customer.sessions.index(adminConnection, {
      body: { shoppingMallCustomerId: customer.id },
    });
  typia.assert(filterByCustomerIdResponse);
  // All returned sessions should have the requested customer ID
  for (const session of filterByCustomerIdResponse.data) {
    TestValidator.equals(
      "session customer ID matches",
      session.shoppingMallCustomerId,
      customer.id,
    );
  }
  // 7. Admin retrieves sessions filtered by IP substring
  // To test this, get an IP substring from one of the session IPs if any
  const sampleIp = filterByCustomerIdResponse.data.length
    ? filterByCustomerIdResponse.data[0].ip.substring(0, 4)
    : "192.";
  const filterByIpResponse =
    await api.functional.shoppingMall.customer.sessions.index(adminConnection, {
      body: { ip: sampleIp },
    });
  typia.assert(filterByIpResponse);
  for (const session of filterByIpResponse.data) {
    TestValidator.predicate(
      "session IP contains filter substring",
      session.ip.includes(sampleIp),
    );
    TestValidator.predicate("session ip is not empty", session.ip.length > 0);
  }
  // 8. Admin retrieves sessions filtered by href (URL substring)
  const sampleHref = filterByIpResponse.data.length
    ? filterByIpResponse.data[0].href.substring(0, 8)
    : "/api/";
  const filterByHrefResponse =
    await api.functional.shoppingMall.customer.sessions.index(adminConnection, {
      body: { href: sampleHref },
    });
  typia.assert(filterByHrefResponse);
  for (const session of filterByHrefResponse.data) {
    TestValidator.predicate(
      "session href contains filter substring",
      session.href.includes(sampleHref),
    );
    TestValidator.predicate(
      "session href is not empty",
      session.href.length > 0,
    );
  }
  // 9. Admin retrieves sessions filtered by referrer substring
  const sampleReferrer = filterByHrefResponse.data.length
    ? filterByHrefResponse.data[0].referrer.substring(0, 8)
    : "https://";
  const filterByReferrerResponse =
    await api.functional.shoppingMall.customer.sessions.index(adminConnection, {
      body: { referrer: sampleReferrer },
    });
  typia.assert(filterByReferrerResponse);
  for (const session of filterByReferrerResponse.data) {
    TestValidator.predicate(
      "session referrer contains filter substring",
      session.referrer.includes(sampleReferrer),
    );
    TestValidator.predicate(
      "session referrer is not empty",
      session.referrer.length > 0,
    );
  }
  // 10. Admin retrieves with pagination (page 2, limit 5)
  const paginationResponse =
    await api.functional.shoppingMall.customer.sessions.index(adminConnection, {
      body: {
        page: 2,
        limit: 5,
      },
    });
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination current page is 2",
    paginationResponse.pagination.current === 2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationResponse.pagination.limit,
    5,
  );
  // 11. Test unauthorized access by trying with customerConnection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(unauthorizedConnection, {
    body: {
      email: customer.email,
      password: "secretpassword",
    },
  });
  await TestValidator.httpError(
    "deny access for unauthorized customer",
    403,
    async () =>
      await api.functional.shoppingMall.customer.sessions.index(
        unauthorizedConnection,
        { body: {} },
      ),
  );
  // 12. Test error response with invalid filter parameters
  await TestValidator.httpError(
    "invalid page number",
    400,
    async () =>
      await api.functional.shoppingMall.customer.sessions.index(
        adminConnection,
        {
          body: { page: 0 },
        },
      ),
  );
  await TestValidator.httpError(
    "invalid limit number",
    400,
    async () =>
      await api.functional.shoppingMall.customer.sessions.index(
        adminConnection,
        {
          body: { limit: 0 },
        },
      ),
  );
  // 13. Check for mandatory properties in session summary
  if (noFilterResponse.data.length > 0) {
    const session = noFilterResponse.data[0];
    TestValidator.predicate(
      "session id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session expiredAt is ISO8601",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
        session.expiredAt,
      ),
    );
    TestValidator.predicate("session ip not empty", session.ip.length > 0);
    TestValidator.predicate("session href not empty", session.href.length > 0);
    TestValidator.predicate(
      "session referrer not empty",
      session.referrer.length > 0,
    );
  }
}
