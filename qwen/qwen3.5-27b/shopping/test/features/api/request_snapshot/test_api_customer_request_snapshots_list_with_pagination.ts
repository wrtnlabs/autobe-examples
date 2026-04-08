import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
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
 * Test customer request snapshots listing with pagination support.
 *
 * Validates that an authenticated customer can retrieve their request snapshots (cancellation and refund request audit records) with proper pagination metadata. The test verifies the paginated response structure, pagination metadata accuracy, and snapshot data completeness including nested customer, seller, and order item references.
 *
 * Special attention is given to verifying that the pagination metadata correctly reflects the current page position, limit, total records count, and total pages calculation. Each snapshot in the data array must contain all required fields including status transition information and related entity summaries.
 *
 * 1. Register and authenticate a customer using authorize_customer_join utility.
 * 2. Call the request snapshots index endpoint without filters to retrieve all snapshots.
 * 3. Validate response structure and pagination metadata.
 * 4. Verify each snapshot contains required fields and nested objects.
 * 5. Test pagination by requesting page 2 with a specific limit.
 * 6. Verify pagination response structure for second page request.
 */
export async function test_api_customer_request_snapshots_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve all snapshots (page 1, default limit)
  const response1: IPageIShoppingMallRequestSnapshot.ISummary =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(response1);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // 4. Validate snapshots data structure
  await ArrayUtil.asyncForEach(response1.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate request_type enum value
    TestValidator.predicate(
      "snapshot has valid request_type",
      snapshot.request_type === "cancellation" ||
        snapshot.request_type === "refund",
    );
    // Validate status_after enum value
    TestValidator.predicate(
      "snapshot has valid status_after",
      snapshot.status_after === "approved" ||
        snapshot.status_after === "rejected",
    );
    // Validate nested objects exist (typia.assert already validates structure)
    typia.assert(snapshot.customer);
    typia.assert(snapshot.seller);
    typia.assert(snapshot.orderItem);
  });
  // 5. Test pagination with page 2 and limit 10
  const response2: IPageIShoppingMallRequestSnapshot.ISummary =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(response2);
  // 6. Validate pagination metadata for page 2
  TestValidator.equals(
    "pagination current page is 2",
    response2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    response2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response2.pagination.pages >= 0,
  );
  // 7. Validate that data array length respects limit
  TestValidator.predicate(
    "page 2 data length does not exceed limit",
    response2.data.length <= 10,
  );
}
