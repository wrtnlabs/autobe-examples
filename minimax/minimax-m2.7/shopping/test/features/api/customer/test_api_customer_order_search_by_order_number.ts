import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order search by order number functionality.
 *
 * Test scenarios:
 * 1. Authenticate as customer via POST /ecommerceMall/auth/customer/join
 * 2. Search with non-existent order number - expect empty results
 * 3. Validate pagination metadata shows records: 0 and pages: 0
 * 4. Test date range filter with createdAtFrom and createdAtTo (ISO 8601 format)
 * 5. Verify date range filter returns empty when no orders in range
 */
export async function test_api_customer_order_search_by_order_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Test search with non-existent order number - expect empty results
  const emptySearchResult =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: "NONEXISTENT_ORDER_12345",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 3. Validate empty results structure
  TestValidator.equals("empty data array", emptySearchResult.data, []);
  TestValidator.equals("records is 0", emptySearchResult.pagination.records, 0);
  TestValidator.equals("pages is 0", emptySearchResult.pagination.pages, 0);
  TestValidator.equals("current is 1", emptySearchResult.pagination.current, 1);
  TestValidator.equals("limit is 20", emptySearchResult.pagination.limit, 20);
  // 4. Test date range filter with ISO 8601 format - expect empty results
  const pastDate = new Date("2020-01-01T00:00:00.000Z").toISOString();
  const futureDate = new Date("2020-12-31T23:59:59.999Z").toISOString();
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAtFrom: pastDate,
          createdAtTo: futureDate,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 5. Validate date range search returns empty (no orders created in 2020)
  TestValidator.equals(
    "empty data array for past date range",
    dateRangeResult.data,
    [],
  );
  TestValidator.equals(
    "records is 0 for past date range",
    dateRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for past date range",
    dateRangeResult.pagination.pages,
    0,
  );
  // 6. Test combining orderNumber and date range filters
  const combinedFilterResult =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: "ANY",
          createdAtFrom: pastDate,
          createdAtTo: futureDate,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "empty with combined filters",
    combinedFilterResult.data,
    [],
  );
  TestValidator.equals(
    "records is 0 with combined filters",
    combinedFilterResult.pagination.records,
    0,
  );
  // 7. Test pagination parameters work with empty results
  const paginatedEmptyResult =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: "NONEXISTENT",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(paginatedEmptyResult);
  TestValidator.equals("empty paginated data", paginatedEmptyResult.data, []);
  TestValidator.equals(
    "limit respects requested value",
    paginatedEmptyResult.pagination.limit,
    10,
  );
}
