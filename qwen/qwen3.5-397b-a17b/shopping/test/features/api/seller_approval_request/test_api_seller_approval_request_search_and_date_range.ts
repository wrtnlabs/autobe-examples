import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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

/**
 * Test searching seller approval requests by seller email and filtering by submission date range.
 *
 * This test validates the administrator's ability to search and filter seller approval requests
 * using email search, date range filters, sorting, and pagination parameters.
 */
export async function test_api_seller_approval_request_search_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple seller accounts with known email addresses
  const sellerEmail1 = `test.seller1.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerEmail2 = `test.seller2.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerEmail3 = `another.seller.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerAuth1 = await authorize_seller_join(sellerConnection1, {
    body: {
      email: sellerEmail1,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerAuth2 = await authorize_seller_join(sellerConnection2, {
    body: {
      email: sellerEmail2,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const sellerConnection3: api.IConnection = { host: connection.host };
  const sellerAuth3 = await authorize_seller_join(sellerConnection3, {
    body: {
      email: sellerEmail3,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth3);
  // 3. Get all approval requests to establish baseline
  const allRequests =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "submitted_at",
          direction: "desc",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.predicate(
    "has approval requests",
    allRequests.data.length >= 3,
  );
  // Find our test sellers in the results
  const testSellerIds = [sellerAuth1.id, sellerAuth2.id, sellerAuth3.id];
  const ourRequests = allRequests.data.filter((req) =>
    testSellerIds.includes(req.seller.id),
  );
  TestValidator.predicate("found our sellers", ourRequests.length >= 3);
  // 4. Test search by partial email match (case-insensitive)
  const searchResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "seller1",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching sellers",
    searchResult.data.every((req) =>
      req.seller.email.toLowerCase().includes("seller1"),
    ),
  );
  // 5. Test search with different partial match
  const searchResult2 =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "another",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "search returns another seller",
    searchResult2.data.every((req) =>
      req.seller.email.toLowerCase().includes("another"),
    ),
  );
  // 6. Test submitted_from date filter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const fromResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: oneHourAgo,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(fromResult);
  TestValidator.predicate(
    "submitted_from filters correctly",
    fromResult.data.every(
      (req) => new Date(req.submitted_at) >= new Date(oneHourAgo),
    ),
  );
  // 7. Test submitted_to date filter
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const toResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          submitted_to: tomorrow,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(toResult);
  TestValidator.predicate(
    "submitted_to filters correctly",
    toResult.data.every(
      (req) => new Date(req.submitted_at) <= new Date(tomorrow),
    ),
  );
  // 8. Test date range filtering (both submitted_from and submitted_to)
  const rangeResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: oneHourAgo,
          submitted_to: tomorrow,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "date range filters correctly",
    rangeResult.data.every(
      (req) =>
        new Date(req.submitted_at) >= new Date(oneHourAgo) &&
        new Date(req.submitted_at) <= new Date(tomorrow),
    ),
  );
  // 9. Test sorting by submitted_at ascending
  const sortedAsc =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sort: "submitted_at",
          direction: "asc",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "ascending sort is correct",
    sortedAsc.data.length <= 1 ||
      sortedAsc.data.every(
        (req, index) =>
          index === 0 ||
          new Date(req.submitted_at) >=
            new Date(sortedAsc.data[index - 1].submitted_at),
      ),
  );
  // 10. Test sorting by submitted_at descending
  const sortedDesc =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sort: "submitted_at",
          direction: "desc",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "descending sort is correct",
    sortedDesc.data.length <= 1 ||
      sortedDesc.data.every(
        (req, index) =>
          index === 0 ||
          new Date(req.submitted_at) <=
            new Date(sortedDesc.data[index - 1].submitted_at),
      ),
  );
  // 11. Test pagination with custom page and limit
  const paginatedResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
          sort: "submitted_at",
          direction: "desc",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit matches",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  // 12. Test combined filters (search + date range)
  const combinedResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "seller",
          submitted_from: oneHourAgo,
          submitted_to: tomorrow,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedResult.data.every(
      (req) =>
        req.seller.email.toLowerCase().includes("seller") &&
        new Date(req.submitted_at) >= new Date(oneHourAgo) &&
        new Date(req.submitted_at) <= new Date(tomorrow),
    ),
  );
  // 13. Verify pagination metadata
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    paginatedResult.pagination.records >= paginatedResult.data.length,
  );
}
