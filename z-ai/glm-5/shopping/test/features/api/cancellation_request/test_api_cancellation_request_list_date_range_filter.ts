import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Define date ranges for testing
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const pastDate = new Date(now.getTime() - 30 * oneDayMs);
  const futureDate = new Date(now.getTime() + 30 * oneDayMs);
  // Step 2: Test filtering by created_at date range
  const createdRangeResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(createdRangeResponse);
  // Step 3: Verify all returned items have created_at within the specified range
  for (const item of createdRangeResponse.data) {
    const createdAt = new Date(item.created_at);
    TestValidator.predicate(
      "created_at within filter range",
      createdAt >= pastDate && createdAt <= futureDate,
    );
  }
  // Step 4: Test filtering by responded_at date range
  const respondedRangeResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          responded_at_from: pastDate.toISOString(),
          responded_at_to: futureDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(respondedRangeResponse);
  // Validate all returned items have responded_at within range (null-safe check)
  for (const item of respondedRangeResponse.data) {
    if (item.responded_at !== null) {
      const respondedAt = new Date(item.responded_at);
      TestValidator.predicate(
        "responded_at within filter range",
        respondedAt >= pastDate && respondedAt <= futureDate,
      );
    }
  }
  // Step 5: Test edge case - created_at_from equals created_at_to (single point filter)
  // Note: Matching exactly on a timestamp is rare, so results may be empty
  const singleDate = new Date(now);
  const singleDateResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          created_at_from: singleDate.toISOString(),
          created_at_to: singleDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(singleDateResponse);
  // Validate: if any results exist, they must have created_at matching the single date
  for (const item of singleDateResponse.data) {
    const createdAt = new Date(item.created_at);
    TestValidator.predicate(
      "created_at matches single date filter",
      createdAt.getTime() === singleDate.getTime(),
    );
  }
  // Step 6: Test validation error - created_at_from > created_at_to should fail
  await TestValidator.error("invalid date range should fail", async () => {
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          created_at_to: pastDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  });
  // Step 7: Test with no date range parameters (should return all requests without filtering)
  const allRequestsResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequestsResponse);
}
