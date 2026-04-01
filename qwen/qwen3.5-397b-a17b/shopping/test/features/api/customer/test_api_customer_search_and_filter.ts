import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

/**
 * Test administrator customer listing with search and filter capabilities.
 *
 * This test validates:
 * 1. Administrator authentication and customer listing access
 * 2. Email-based partial search functionality
 * 3. Deletion status filtering (active vs deleted accounts)
 * 4. Case-insensitive search matching
 * 5. Pagination and response structure validation
 */
export async function test_api_customer_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminAuth.token.access,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Create multiple customer accounts with distinct email addresses
  const customerEmails = [
    "alice.test@example.com",
    "bob.test@example.com",
    "charlie.test@example.com",
  ] as const;
  const customerAuths: IShoppingMallCustomer.IAuthorized[] = [];
  for (const email of customerEmails) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customerAuth);
    customerAuths.push(customerAuth);
  }
  // 3. Test email search - search for "alice"
  const aliceSearchResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminLoginConnection,
      {
        body: {
          search: "alice",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(aliceSearchResult);
  TestValidator.predicate(
    "alice search returns at least 1 result",
    () => aliceSearchResult.data.length >= 1,
  );
  TestValidator.predicate("alice search results contain alice email", () =>
    aliceSearchResult.data.some((c) => c.email.includes("alice")),
  );
  // 4. Test email search - search for "test" (should return all 3 customers)
  const testSearchResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminLoginConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(testSearchResult);
  TestValidator.predicate(
    "test search returns at least 3 results",
    () => testSearchResult.data.length >= 3,
  );
  // 5. Test email search - case insensitive (search for "ALICE")
  const aliceUpperSearchResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminLoginConnection,
      {
        body: {
          search: "ALICE",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(aliceUpperSearchResult);
  TestValidator.predicate(
    "ALICE search (case insensitive) returns at least 1 result",
    () => aliceUpperSearchResult.data.length >= 1,
  );
  TestValidator.predicate("ALICE search results contain alice email", () =>
    aliceUpperSearchResult.data.some((c) =>
      c.email.toLowerCase().includes("alice"),
    ),
  );
  // 6. Test deletion status filter - deleted=false (active accounts)
  const activeCustomersResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminLoginConnection,
      {
        body: {
          deleted: false,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(activeCustomersResult);
  TestValidator.predicate(
    "active filter returns only non-deleted accounts",
    () => activeCustomersResult.data.every((c) => c.deleted_at === null),
  );
  // 7. Test deletion status filter - deleted=true (deleted accounts)
  // Note: Since we haven't deleted any customers, this should return 0 or only pre-existing deleted accounts
  const deletedCustomersResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminLoginConnection,
      {
        body: {
          deleted: true,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(deletedCustomersResult);
  TestValidator.predicate("deleted filter returns only deleted accounts", () =>
    deletedCustomersResult.data.every(
      (c) => c.deleted_at !== null && c.deleted_at !== undefined,
    ),
  );
  // 8. Test deletion status filter - deleted=null/omitted (all accounts)
  const allCustomersResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(allCustomersResult);
  TestValidator.predicate(
    "no deleted filter returns all accounts",
    () => allCustomersResult.data.length >= 3,
  );
  // 9. Verify pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    () => allCustomersResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => allCustomersResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    () => allCustomersResult.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    () => allCustomersResult.pagination.pages >= 1,
  );
  // 10. Verify customer summary structure
  const firstCustomer = allCustomersResult.data[0];
  TestValidator.predicate("customer has valid UUID id", () =>
    /^[0-9a-f-]{36}$/i.test(firstCustomer.id),
  );
  TestValidator.predicate("customer has valid email format", () =>
    firstCustomer.email.includes("@"),
  );
  TestValidator.predicate(
    "customer has valid created_at timestamp",
    () => !isNaN(Date.parse(firstCustomer.created_at)),
  );
}
