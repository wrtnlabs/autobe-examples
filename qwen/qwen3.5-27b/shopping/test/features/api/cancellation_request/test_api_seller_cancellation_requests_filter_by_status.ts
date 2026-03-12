import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller cancellation requests filtering by status.
   *
   * This test validates that the cancellation requests endpoint correctly
   * filters results based on the status parameter (pending, approved, rejected).
   * The test verifies that each status filter returns valid paginated responses.
   */
  // 1. Setup: Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Register and authenticate as customer (for completeness)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Test: Filter by status='pending'
  const pendingRequests =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingRequests);
  TestValidator.predicate(
    "pending filter - valid page number",
    pendingRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending filter - non-negative records",
    pendingRequests.pagination.records >= 0,
  );
  // 4. Test: Filter by status='approved'
  const approvedRequests =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedRequests);
  TestValidator.predicate(
    "approved filter - valid page number",
    approvedRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "approved filter - non-negative records",
    approvedRequests.pagination.records >= 0,
  );
  // 5. Test: Filter by status='rejected'
  const rejectedRequests =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.predicate(
    "rejected filter - valid page number",
    rejectedRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "rejected filter - non-negative records",
    rejectedRequests.pagination.records >= 0,
  );
  // 6. Test: Filter without status (all requests)
  const allRequests =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(allRequests);
  TestValidator.predicate(
    "no filter - valid page number",
    allRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "no filter - non-negative records",
    allRequests.pagination.records >= 0,
  );
  // 7. Validate that unfiltered results include all filtered results
  TestValidator.predicate(
    "all requests >= sum of filtered requests",
    allRequests.pagination.records >=
      pendingRequests.pagination.records +
        approvedRequests.pagination.records +
        rejectedRequests.pagination.records,
  );
}
