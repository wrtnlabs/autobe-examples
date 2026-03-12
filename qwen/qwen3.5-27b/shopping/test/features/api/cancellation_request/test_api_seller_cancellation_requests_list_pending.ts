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
 * Test that a seller can retrieve a paginated list of their pending cancellation requests.
 *
 * This test validates:
 * 1. Seller authentication and authorization
 * 2. Pagination metadata correctness
 * 3. Pending cancellation request data structure (if any exist)
 * 4. Null values for unresponded fields (seller, respondedAt)
 * 5. Customer and order item information inclusion
 */
export async function test_api_seller_cancellation_requests_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Setup: Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 3. Execution: Seller retrieves pending cancellation requests
  const response =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validation: Check pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validation: Check data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 6. Validation: Verify pagination consistency
  TestValidator.equals(
    "data length matches records",
    response.data.length,
    response.pagination.records,
  );
  // 7. Validation: If there are pending cancellation requests, validate their structure
  if (response.data.length > 0) {
    const firstRequest = response.data[0];
    // Validate cancellation request business fields
    TestValidator.predicate(
      "has cancellation reason",
      firstRequest.reason.length > 0,
    );
    TestValidator.equals("status is pending", firstRequest.status, "pending");
    TestValidator.equals(
      "respondedAt is null for pending",
      firstRequest.respondedAt,
      null,
    );
    TestValidator.equals(
      "rejectionReason is null for pending",
      firstRequest.rejectionReason,
      null,
    );
    // Validate customer information exists
    TestValidator.predicate(
      "customer has display name",
      firstRequest.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer has valid status",
      ["active", "suspended", "banned"].includes(firstRequest.customer.status),
    );
    // Validate order item information
    TestValidator.equals(
      "orderItem status is paid",
      firstRequest.orderItem.status,
      "paid",
    );
    TestValidator.predicate(
      "orderItem quantity is positive",
      firstRequest.orderItem.quantity >= 1,
    );
    TestValidator.predicate(
      "orderItem price is non-negative",
      firstRequest.orderItem.price >= 0,
    );
    // Validate seller field is null for pending requests
    TestValidator.equals(
      "seller is null for pending requests",
      firstRequest.seller,
      null,
    );
  }
  // 8. Validation: Test with different pagination parameters
  const page2Response =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Response.pagination.limit,
    10,
  );
}
