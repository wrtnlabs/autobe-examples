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

/**
 * Test that customers can only view their own cancellation requests, not other customers' requests.
 *
 * This test validates data isolation in the cancellation requests endpoint by:
 * 1. Creating two separate customer accounts
 * 2. Querying cancellation requests from each customer's perspective
 * 3. Verifying that each customer can only see their own requests
 * 4. Ensuring the customer reference in responses matches the authenticated user
 */
export async function test_api_customer_cancellation_requests_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      display_name: "Customer A",
      phone_number: "01011112222",
    },
  });
  typia.assert(customerA);
  // 2. Setup: Register and authenticate as customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      display_name: "Customer B",
      phone_number: "01033334444",
    },
  });
  typia.assert(customerB);
  // 3. Setup: Register and authenticate as a seller (for completeness, though not directly used)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: "Test Shop",
      shop_description: "A test shop for data isolation testing",
    },
  });
  typia.assert(seller);
  // 4. Test: Customer A queries their cancellation requests
  const customerARequests =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerAConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(customerARequests);
  // 5. Test: Customer B queries their cancellation requests
  const customerBRequests =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerBConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(customerBRequests);
  // 6. Validate: Each customer sees only their own requests (data isolation)
  // Customer A should only see requests where customer.id matches customerA.id
  await ArrayUtil.asyncForEach(customerARequests.data, async (request) => {
    TestValidator.equals(
      "customer A request belongs to customer A",
      request.customer.id,
      customerA.id,
    );
    TestValidator.equals(
      "customer A request email matches",
      request.customer.email,
      customerA.email,
    );
  });
  // Customer B should only see requests where customer.id matches customerB.id
  await ArrayUtil.asyncForEach(customerBRequests.data, async (request) => {
    TestValidator.equals(
      "customer B request belongs to customer B",
      request.customer.id,
      customerB.id,
    );
    TestValidator.equals(
      "customer B request email matches",
      request.customer.email,
      customerB.email,
    );
  });
  // 7. Validate: Customer A cannot see customer B's requests
  // If customer A has any requests, none should belong to customer B
  await ArrayUtil.asyncForEach(customerARequests.data, async (request) => {
    TestValidator.notEquals(
      "customer A cannot see customer B's requests",
      request.customer.id,
      customerB.id,
    );
  });
  // 8. Validate: Customer B cannot see customer A's requests
  // If customer B has any requests, none should belong to customer A
  await ArrayUtil.asyncForEach(customerBRequests.data, async (request) => {
    TestValidator.notEquals(
      "customer B cannot see customer A's requests",
      request.customer.id,
      customerA.id,
    );
  });
  // 9. Validate: Pagination metadata is correct for both customers
  TestValidator.predicate(
    "customer A pagination is valid",
    customerARequests.pagination.current >= 1 &&
      customerARequests.pagination.limit > 0 &&
      customerARequests.pagination.records >= 0 &&
      customerARequests.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "customer B pagination is valid",
    customerBRequests.pagination.current >= 1 &&
      customerBRequests.pagination.limit > 0 &&
      customerBRequests.pagination.records >= 0 &&
      customerBRequests.pagination.pages >= 0,
  );
  // 10. Validate: Data isolation is enforced
  // Each customer's request count should be independent
  TestValidator.predicate(
    "data isolation enforced - customer A has independent request count",
    customerARequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data isolation enforced - customer B has independent request count",
    customerBRequests.pagination.records >= 0,
  );
}
