import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cancellation request list with status filtering.
 *
 * This test verifies that customers can retrieve their cancellation requests
 * with various status filters. The test covers:
 * 1. Customer authentication via join
 * 2. Retrieving all cancellation requests (no filter)
 * 3. Filtering by status: PENDING, APPROVED, REJECTED
 * 4. Verifying response structure and pagination metadata
 * 5. Verifying each request includes required fields
 * 6. Verifying sorting by requested_at DESC (newest first)
 */
export async function test_api_cancellation_request_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve all cancellation requests (no filter)
  const allRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    () => allRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => allRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => allRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => allRequests.pagination.pages >= 0,
  );
  // Verify data array exists
  TestValidator.predicate("data is array", () =>
    Array.isArray(allRequests.data),
  );
  // 3. Test filtering by PENDING status
  const pendingRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Verify all pending requests have status PENDING and null responded_at/respondedSeller
  for (const request of pendingRequests.data) {
    TestValidator.equals("pending status", request.status, "PENDING");
    TestValidator.predicate(
      "pending has null responded_at",
      () => request.responded_at === null,
    );
    TestValidator.predicate(
      "pending has null respondedSeller",
      () => request.respondedSeller === null,
    );
  }
  // 4. Test filtering by APPROVED status
  const approvedRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "APPROVED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Verify all approved requests have status APPROVED and non-null responded_at/respondedSeller
  for (const request of approvedRequests.data) {
    TestValidator.equals("approved status", request.status, "APPROVED");
    TestValidator.predicate(
      "approved has responded_at",
      () => request.responded_at !== null,
    );
    TestValidator.predicate(
      "approved has respondedSeller",
      () => request.respondedSeller !== null,
    );
  }
  // 5. Test filtering by REJECTED status
  const rejectedRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "REJECTED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Verify all rejected requests have status REJECTED and non-null responded_at/respondedSeller
  for (const request of rejectedRequests.data) {
    TestValidator.equals("rejected status", request.status, "REJECTED");
    TestValidator.predicate(
      "rejected has responded_at",
      () => request.responded_at !== null,
    );
    TestValidator.predicate(
      "rejected has respondedSeller",
      () => request.respondedSeller !== null,
    );
  }
  // 6. Verify sorting by requested_at DESC (newest first)
  if (allRequests.data.length > 1) {
    for (let i = 0; i < allRequests.data.length - 1; i++) {
      const current = allRequests.data[i];
      const next = allRequests.data[i + 1];
      const currentTimestamp = new Date(current.requested_at).getTime();
      const nextTimestamp = new Date(next.requested_at).getTime();
      TestValidator.predicate(
        "sorted by requested_at DESC",
        () => currentTimestamp >= nextTimestamp,
      );
    }
  }
}
