import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin can list all cancellation requests with pagination.
 * 1. Admin authenticates via join endpoint
 * 2. Admin retrieves paginated list of all cancellation requests
 * 3. Validate response structure and pagination metadata
 * 4. Verify cancellation request summary fields
 */
export async function test_api_cancellation_requests_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve cancellation requests with default pagination
  const response =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Validate each cancellation request summary
  await ArrayUtil.asyncForEach(response.data, async (request, index) => {
    typia.assert(request);
    // Validate required fields exist
    TestValidator.predicate(
      `request[${index}] has id`,
      request.id !== undefined,
    );
    TestValidator.predicate(
      `request[${index}] has reason`,
      request.reason !== undefined,
    );
    TestValidator.predicate(
      `request[${index}] has status`,
      request.status !== undefined,
    );
    TestValidator.predicate(
      `request[${index}] has requestedAt`,
      request.requestedAt !== undefined,
    );
    // Validate status is one of valid values
    TestValidator.predicate(
      `request[${index}] status is valid`,
      ["pending", "approved", "rejected"].includes(request.status),
    );
    // Validate respondedAt is null when status is pending
    if (request.status === "pending") {
      TestValidator.equals(
        `request[${index}] respondedAt is null when pending`,
        request.respondedAt,
        null,
      );
      TestValidator.equals(
        `request[${index}] seller is null when pending`,
        request.seller,
        null,
      );
      TestValidator.equals(
        `request[${index}] rejectionReason is null when pending`,
        request.rejectionReason,
        null,
      );
    }
    // Validate rejectionReason is null unless status is rejected
    if (request.status !== "rejected") {
      TestValidator.equals(
        `request[${index}] rejectionReason is null when not rejected`,
        request.rejectionReason,
        null,
      );
    }
    // Validate customer exists
    typia.assert(request.customer);
    TestValidator.predicate(
      `request[${index}] customer has id`,
      request.customer.id !== undefined,
    );
    // Validate orderItem exists
    typia.assert(request.orderItem);
    TestValidator.predicate(
      `request[${index}] orderItem has id`,
      request.orderItem.id !== undefined,
    );
  });
  // 6. Verify sorting by requested_at descending (if multiple requests exist)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `requests are sorted by requested_at descending`,
        new Date(response.data[i - 1].requestedAt) >=
          new Date(response.data[i].requestedAt),
      );
    }
  }
}
