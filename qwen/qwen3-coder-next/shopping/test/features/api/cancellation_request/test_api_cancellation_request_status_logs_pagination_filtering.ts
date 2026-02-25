import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequestLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestLog";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";

export async function test_api_cancellation_request_status_logs_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create multiple cancellation requests using available API
  const cancellationRequests: IShoppingMallOrderCancellationRequest[] = [];
  for (let i = 0; i < 5; i++) {
    const request =
      await api.functional.shoppingMall.customer.order_items.cancel_request.create(
        customerConnection,
        {
          itemId: customer.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallOrderCancellationRequest.ICreate,
        },
      );
    typia.assert(request);
    cancellationRequests.push(request);
  }
  // Test pagination and filtering functionality for status logs
  // 1. Test default pagination (page=1, limit=20)
  const logs1 =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logs1);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", logs1.pagination.current, 1);
  TestValidator.equals("limit is 20", logs1.pagination.limit, 20);
  TestValidator.predicate(
    "records greater than 0",
    logs1.pagination.records > 0,
  );
  TestValidator.equals(
    "pages calculated correctly",
    logs1.pagination.pages,
    Math.ceil(logs1.pagination.records / 20),
  );
  // 2. Test different page and limit values
  const logs2 =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logs2);
  TestValidator.equals("current page is 2", logs2.pagination.current, 2);
  TestValidator.equals("limit is 10", logs2.pagination.limit, 10);
  // 3. Test boundary values for limit (minimum 1)
  const logs3 =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logs3);
  TestValidator.equals("limit is 1 (minimum)", logs3.pagination.limit, 1);
  // 4. Test boundary values for limit (maximum 100)
  const logs4 =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logs4);
  TestValidator.equals("limit is 100 (maximum)", logs4.pagination.limit, 100);
  // 5. Test out-of-range page
  const logs5 =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 999,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logs5);
  TestValidator.equals(
    "empty result for out-of-range page",
    logs5.data.length,
    0,
  );
  TestValidator.equals(
    "records still correct for out-of-range",
    logs5.pagination.records,
    logs1.pagination.records,
  );
  // 6. Test filtering by status "approved"
  const logsApproved =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 20,
          status: "approved",
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logsApproved);
  // All returned logs should have to_status of "approved"
  for (const log of logsApproved.data) {
    TestValidator.equals("log status is approved", log.to_status, "approved");
  }
  // 7. Test filtering by status "pending"
  const logsPending =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logsPending);
  // All returned logs should have to_status of "pending"
  for (const log of logsPending.data) {
    TestValidator.equals("log status is pending", log.to_status, "pending");
  }
  // 8. Test filtering by status "rejected"
  const logsRejected =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 20,
          status: "rejected",
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logsRejected);
  // All returned logs should have to_status of "rejected"
  for (const log of logsRejected.data) {
    TestValidator.equals("log status is rejected", log.to_status, "rejected");
  }
  // 9. Test empty result when filtering with non-matching status
  // Get all unique statuses from the first request to find a non-existing status
  const existingStatuses = [...new Set(logs1.data.map((l) => l.to_status))];
  const nonExistingStatus =
    existingStatuses.length > 0 && existingStatuses[0] === "pending"
      ? "approved"
      : "pending";
  const logsEmpty =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      customerConnection,
      {
        requestId: cancellationRequests[0].id,
        body: {
          page: 1,
          limit: 20,
          status: nonExistingStatus,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logsEmpty);
  TestValidator.equals(
    "empty result for non-matching status",
    logsEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "records is 0 for non-matching status",
    logsEmpty.pagination.records,
    0,
  );
}
