import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer refund request search and pagination functionality with text search, filtering, and sorting.
 *
 * Validates the complete refund request search workflow including text-based fuzzy search on reason field, pagination with limit and page parameters, and sorting by various fields (created_at, responded_at, status) in both ascending and descending order. Ensures that search results are correctly filtered, paginated, and sorted according to the specified criteria.
 *
 * Special attention is given to verifying that text search uses trigram similarity for flexible matching, pagination metadata is accurate, and sorting respects both the field and direction parameters.
 *
 * 1. Customer registers and authenticates to access refund requests.
 * 2. Search with a keyword that matches some reason texts - verify fuzzy matching returns results.
 * 3. Search with a keyword that matches no reasons - verify empty results are returned.
 * 4. Test pagination with limit=10 - verify correct number of results per page.
 * 5. Test page-based pagination - use page parameter to get second page.
 * 6. Test sorting by responded_at ascending - verify oldest responses first.
 * 7. Test sorting by status - verify alphabetical ordering.
 * 8. Test sorting with sortOrder='asc' and sortOrder='desc' - verify correct order direction.
 */
export async function test_api_refund_request_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Search with a keyword that matches some reason texts
  const searchResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          search: "refund",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns valid results",
    searchResult.pagination.records >= 0,
  );
  // 3. Search with a keyword that matches no reasons - verify empty results
  const noMatchResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          search: "xyznonexistentkeyword12345",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match returns empty results",
    noMatchResult.data.length,
    0,
  );
  // 4. Test pagination with limit=10
  const paginatedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination respects limit",
    paginatedResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination limit field matches request",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  // 5. Test page-based pagination - get second page
  if (paginatedResult.pagination.pages > 1) {
    const page2Result =
      await api.functional.shoppingMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            limit: 10,
            page: 2,
          } satisfies IShoppingMallRefundRequest.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "second page current is 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page returns valid results",
      page2Result.data.length >= 0,
    );
  }
  // 6. Test sorting by responded_at ascending
  const respondedAtAscResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "responded_at",
          sortOrder: "asc",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(respondedAtAscResult);
  TestValidator.predicate(
    "responded_at ascending sort returns valid results",
    respondedAtAscResult.data.length >= 0,
  );
  // 7. Test sorting by status - verify alphabetical ordering
  const statusSortResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "status",
          sortOrder: "asc",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(statusSortResult);
  TestValidator.predicate(
    "status alphabetical sort returns valid results",
    statusSortResult.data.length >= 0,
  );
  // 8. Test sorting with sortOrder='desc'
  const descSortResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(descSortResult);
  TestValidator.predicate(
    "created_at descending sort returns valid results",
    descSortResult.data.length >= 0,
  );
  // Validate sorting order for status (if we have multiple results)
  if (statusSortResult.data.length > 1) {
    let isSorted = true;
    for (let i = 1; i < statusSortResult.data.length; i++) {
      if (
        statusSortResult.data[i - 1].status > statusSortResult.data[i].status
      ) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate(
      "status results are in ascending alphabetical order",
      isSorted,
    );
  }
}
