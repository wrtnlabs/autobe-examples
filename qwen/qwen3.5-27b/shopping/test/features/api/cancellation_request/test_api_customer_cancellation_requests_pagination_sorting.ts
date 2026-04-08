import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
 * Test pagination and sorting functionality for cancellation requests listing.
 *
 * Validates the pagination metadata accuracy and sort order behavior of the cancellation requests listing endpoint. Tests various pagination parameters including default settings, custom page sizes, page navigation, and sort directions.
 *
 * The test verifies that pagination metadata (current page, limit, total records, total pages) is accurate and that sort parameters are correctly applied to order results by creation date.
 *
 * 1. Customer registers and authenticates to access cancellation requests endpoint.
 * 2. Test default pagination returns correct metadata with page=1, limit=20.
 * 3. Test custom page sizes (limit=10, limit=50) return correct number of items.
 * 4. Test page navigation (page=1, page=2) returns different pages with correct metadata.
 * 5. Test sort by createdAt ascending (oldest first) orders results correctly.
 * 6. Test sort by createdAt descending (newest first, default) orders results correctly.
 * 7. Validate pagination metadata accuracy for all test scenarios.
 */
export async function test_api_customer_cancellation_requests_pagination_sorting(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test default pagination (page=1, limit=20)
  const defaultPage =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default pagination current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default pagination records non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // 3. Test custom page size limit=10
  const smallPage =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals("small page limit", smallPage.pagination.limit, 10);
  TestValidator.predicate(
    "small page data count matches limit or records",
    smallPage.data.length ===
      Math.min(smallPage.pagination.limit, smallPage.pagination.records),
  );
  // 4. Test custom page size limit=50
  const largePage =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          limit: 50,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals("large page limit", largePage.pagination.limit, 50);
  TestValidator.predicate(
    "large page data count matches limit or records",
    largePage.data.length ===
      Math.min(largePage.pagination.limit, largePage.pagination.records),
  );
  // 5. Test page navigation page=1
  const page1 =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  // 6. Test page navigation page=2
  const page2 =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 7. Test sort by createdAt ascending (oldest first)
  const sortedAsc =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "ascending sort data is ordered by createdAt",
    sortedAsc.data.length <= 1
      ? true
      : sortedAsc.data.every((item, index, array) => {
          if (index === 0) return true;
          const prevDate = new Date(array[index - 1].created_at).getTime();
          const currDate = new Date(item.created_at).getTime();
          return currDate >= prevDate;
        }),
  );
  // 8. Test sort by createdAt descending (newest first, default)
  const sortedDesc =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "descending sort data is ordered by createdAt",
    sortedDesc.data.length <= 1
      ? true
      : sortedDesc.data.every((item, index, array) => {
          if (index === 0) return true;
          const prevDate = new Date(array[index - 1].created_at).getTime();
          const currDate = new Date(item.created_at).getTime();
          return currDate <= prevDate;
        }),
  );
  // 9. Test empty result set pagination
  TestValidator.predicate(
    "empty result has correct pagination",
    defaultPage.pagination.records === 0
      ? defaultPage.pagination.pages === 0 && defaultPage.data.length === 0
      : true,
  );
}
