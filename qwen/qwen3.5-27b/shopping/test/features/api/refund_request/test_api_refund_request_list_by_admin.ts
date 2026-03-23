import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can retrieve a paginated list of all refund requests across the shopping mall platform.
 *
 * This test verifies that:
 * 1. Admin authentication works correctly
 * 2. Admin can access all refund requests platform-wide
 * 3. Pagination functionality works as expected
 * 4. Response structure matches the expected schema
 * 5. Refund request summaries contain all required order item information
 */
export async function test_api_refund_request_list_by_admin(
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
  // 2. Fetch refund requests with default pagination
  const defaultResponse =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate default response structure
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 4. Validate each refund request in data array
  await ArrayUtil.asyncForEach(defaultResponse.data, async (refundRequest) => {
    typia.assert(refundRequest);
    // Verify refund request fields exist
    TestValidator.predicate(
      "refund request has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        refundRequest.id,
      ),
    );
    TestValidator.predicate(
      "refund request has reason",
      refundRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "refund request has valid status",
      ["pending", "approved", "rejected"].includes(refundRequest.status),
    );
    TestValidator.predicate(
      "refund request has requested_at",
      refundRequest.requested_at.length > 0,
    );
    // Verify orderItem structure
    typia.assert(refundRequest.orderItem);
    TestValidator.predicate(
      "order item has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        refundRequest.orderItem.id,
      ),
    );
    TestValidator.predicate(
      "order item has orderId",
      refundRequest.orderItem.orderId.length > 0,
    );
    TestValidator.predicate(
      "order item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        refundRequest.orderItem.status,
      ),
    );
    TestValidator.predicate(
      "order item has positive quantity",
      refundRequest.orderItem.quantity >= 1,
    );
    TestValidator.predicate(
      "order item has non-negative price",
      refundRequest.orderItem.price >= 0,
    );
    TestValidator.predicate(
      "order item has createdAt",
      refundRequest.orderItem.createdAt.length > 0,
    );
  });
  // 5. Test pagination with page=2 and limit=10
  const paginatedResponse =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 6. Validate paginated response
  TestValidator.equals(
    "paginated response current page",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated response limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "paginated response has valid records count",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "paginated response data length matches limit or less",
    paginatedResponse.data.length <= 10,
  );
  // 7. Verify sorting (newest first) if we have multiple records
  if (defaultResponse.data.length >= 2) {
    TestValidator.predicate(
      "results sorted by requested_at DESC",
      new Date(defaultResponse.data[0].requested_at).getTime() >=
        new Date(defaultResponse.data[1].requested_at).getTime(),
    );
  }
}
