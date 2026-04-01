import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_list_email_search_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Create multiple seller accounts with different email patterns
  const seller1Email = `test.search.alpha@example.com`;
  const seller2Email = `test.search.beta@example.com`;
  const seller3Email = `other.gamma@example.com`;
  const seller4Email = `test.delta@example.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller1 = await authorize_seller_join(connection, {
    body: {
      email: seller1Email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1);
  const seller2 = await authorize_seller_join(connection, {
    body: {
      email: seller2Email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2);
  const seller3 = await authorize_seller_join(connection, {
    body: {
      email: seller3Email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller3);
  const seller4 = await authorize_seller_join(connection, {
    body: {
      email: seller4Email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller4);
  // 3. Test email partial match search - search for 'test'
  const searchResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify all returned sellers have 'test' in their email
  TestValidator.predicate("all results contain 'test' in email", () =>
    searchResult.data.every((seller) => seller.email.includes("test")),
  );
  TestValidator.predicate(
    "found at least 3 sellers with 'test'",
    () => searchResult.data.length >= 3,
  );
  // 4. Test email partial match - search for 'alpha'
  const alphaResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          search: "alpha",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(alphaResult);
  TestValidator.predicate("alpha search returns only alpha seller", () =>
    alphaResult.data.every((seller) => seller.email.includes("alpha")),
  );
  TestValidator.equals("alpha search count", alphaResult.data.length, 1);
  // 5. Test no matching results for search term
  const noMatchResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_xyz_123",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals("no match returns empty", noMatchResult.data.length, 0);
  TestValidator.equals(
    "no match pages is 0",
    noMatchResult.pagination.pages,
    0,
  );
  // 6. Test date range filtering - get current time and create a range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Query with date range that should include all recently created sellers
  const dateRangeResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Verify all sellers in result were created within the date range
  TestValidator.predicate("all sellers within date range", () =>
    dateRangeResult.data.every((seller) => {
      const createdAt = new Date(seller.created_at);
      return createdAt >= yesterday && createdAt <= tomorrow;
    }),
  );
  TestValidator.predicate(
    "date range returns at least 4 sellers",
    () => dateRangeResult.data.length >= 4,
  );
  // 7. Test date range with no sellers (past date range)
  const oldDateFrom = new Date("2020-01-01T00:00:00Z");
  const oldDateTo = new Date("2020-12-31T23:59:59Z");
  const oldDateResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          created_at_from: oldDateFrom.toISOString(),
          created_at_to: oldDateTo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(oldDateResult);
  TestValidator.equals(
    "old date range returns empty",
    oldDateResult.data.length,
    0,
  );
  // 8. Test combination of email search with date range
  const combinedResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          search: "test",
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify all results match both criteria
  TestValidator.predicate("combined filter - all contain 'test'", () =>
    combinedResult.data.every((seller) => seller.email.includes("test")),
  );
  TestValidator.predicate("combined filter - all within date range", () =>
    combinedResult.data.every((seller) => {
      const createdAt = new Date(seller.created_at);
      return createdAt >= yesterday && createdAt <= tomorrow;
    }),
  );
  // 9. Test pagination with filtered results
  const paginatedResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "pagination pages calculated",
    () => paginatedResult.pagination.pages >= 1,
  );
  // 10. Test sorting by email
  const sortedAscResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          search: "test",
          sort: "email_ASC",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sortedAscResult);
  // Verify emails are sorted ascending
  TestValidator.predicate("emails sorted ascending", () => {
    const emails = sortedAscResult.data.map((s) => s.email);
    const sorted = [...emails].sort();
    return emails.every((email, i) => email === sorted[i]);
  });
}
